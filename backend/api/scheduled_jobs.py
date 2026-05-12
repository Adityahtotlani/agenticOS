import asyncio
import secrets
import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from apscheduler.triggers.cron import CronTrigger

from database import get_db, SessionLocal
from models import Task
from models.scheduled_job import ScheduledJob
from models.user import User
from scheduler import scheduler
from auth import get_current_user

router = APIRouter(tags=["scheduled_jobs"])


# ---------------------------------------------------------------------------
# Pydantic schemas
# ---------------------------------------------------------------------------

class ScheduledJobCreate(BaseModel):
    name: str
    agent_id: int
    cron_expr: str
    task_title: str
    task_description: str = ""
    enabled: bool = True


class ScheduledJobUpdate(BaseModel):
    name: Optional[str] = None
    cron_expr: Optional[str] = None
    task_title: Optional[str] = None
    task_description: Optional[str] = None
    enabled: Optional[bool] = None


class ScheduledJobResponse(BaseModel):
    id: int
    name: str
    agent_id: int
    cron_expr: str
    task_title: str
    task_description: str
    enabled: bool
    webhook_token: Optional[str]
    last_run_at: Optional[datetime.datetime]
    created_at: Optional[datetime.datetime]

    class Config:
        from_attributes = True


# ---------------------------------------------------------------------------
# Helper: build a CronTrigger from a 5-field cron string
# ---------------------------------------------------------------------------

def _cron_trigger(cron_expr: str) -> CronTrigger:
    parts = cron_expr.strip().split()
    if len(parts) != 5:
        raise ValueError(f"Expected 5-field cron expression, got: {cron_expr!r}")
    minute, hour, day, month, day_of_week = parts
    return CronTrigger(
        minute=minute,
        hour=hour,
        day=day,
        month=month,
        day_of_week=day_of_week,
    )


# ---------------------------------------------------------------------------
# Helper: the function APScheduler calls on each tick
# ---------------------------------------------------------------------------

async def _run_scheduled_job(job_id: int) -> None:
    db = SessionLocal()
    try:
        job = db.query(ScheduledJob).filter(ScheduledJob.id == job_id).first()
        if not job or not job.enabled:
            return

        task = Task(
            title=job.task_title,
            description=job.task_description,
            agent_id=job.agent_id,
            status="queued",
        )
        db.add(task)
        job.last_run_at = datetime.datetime.utcnow()
        db.commit()
        db.refresh(task)

        task_id = task.id
        agent_id = job.agent_id
    finally:
        db.close()

    # Fire and forget — import here to avoid circular imports at module load
    from agents.runtime import AgentRuntime

    async def _fire():
        runtime = AgentRuntime(agent_id)
        async for _ in runtime.run_task(task_id):
            pass  # consume generator; side-effects update DB

    asyncio.create_task(_fire())


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@router.get("/api/scheduled-jobs", response_model=List[ScheduledJobResponse])
def list_scheduled_jobs(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return db.query(ScheduledJob).filter(ScheduledJob.owner_id == current_user.id).all()


@router.post("/api/scheduled-jobs", response_model=ScheduledJobResponse)
def create_scheduled_job(payload: ScheduledJobCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    try:
        trigger = _cron_trigger(payload.cron_expr)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc))

    job = ScheduledJob(
        name=payload.name,
        agent_id=payload.agent_id,
        cron_expr=payload.cron_expr,
        task_title=payload.task_title,
        task_description=payload.task_description,
        enabled=payload.enabled,
        webhook_token=secrets.token_urlsafe(24),
        owner_id=current_user.id,
    )
    db.add(job)
    db.commit()
    db.refresh(job)

    if job.enabled:
        scheduler.add_job(
            _run_scheduled_job,
            trigger=trigger,
            id=f"job_{job.id}",
            args=[job.id],
            replace_existing=True,
        )

    return job


@router.patch("/api/scheduled-jobs/{job_id}", response_model=ScheduledJobResponse)
def update_scheduled_job(job_id: int, payload: ScheduledJobUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    job = db.query(ScheduledJob).filter(ScheduledJob.id == job_id, ScheduledJob.owner_id == current_user.id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Scheduled job not found")

    if payload.name is not None:
        job.name = payload.name
    if payload.cron_expr is not None:
        try:
            _cron_trigger(payload.cron_expr)  # validate
        except ValueError as exc:
            raise HTTPException(status_code=422, detail=str(exc))
        job.cron_expr = payload.cron_expr
    if payload.task_title is not None:
        job.task_title = payload.task_title
    if payload.task_description is not None:
        job.task_description = payload.task_description
    if payload.enabled is not None:
        job.enabled = payload.enabled

    db.commit()
    db.refresh(job)

    # Re-schedule: remove existing APScheduler job then re-add if enabled
    apscheduler_id = f"job_{job.id}"
    try:
        scheduler.remove_job(apscheduler_id)
    except Exception:
        pass

    if job.enabled:
        trigger = _cron_trigger(job.cron_expr)
        scheduler.add_job(
            _run_scheduled_job,
            trigger=trigger,
            id=apscheduler_id,
            args=[job.id],
            replace_existing=True,
        )

    return job


@router.delete("/api/scheduled-jobs/{job_id}")
def delete_scheduled_job(job_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    job = db.query(ScheduledJob).filter(ScheduledJob.id == job_id, ScheduledJob.owner_id == current_user.id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Scheduled job not found")

    try:
        scheduler.remove_job(f"job_{job.id}")
    except Exception:
        pass

    db.delete(job)
    db.commit()
    return {"ok": True}


@router.post("/api/webhooks/{token}")
async def webhook_trigger(token: str, db: Session = Depends(get_db)):
    job = db.query(ScheduledJob).filter(ScheduledJob.webhook_token == token).first()
    if not job:
        raise HTTPException(status_code=404, detail="Webhook token not found")
    if not job.enabled:
        raise HTTPException(status_code=409, detail="Scheduled job is disabled")

    task = Task(
        title=job.task_title,
        description=job.task_description,
        agent_id=job.agent_id,
        status="queued",
    )
    db.add(task)
    job.last_run_at = datetime.datetime.utcnow()
    db.commit()
    db.refresh(task)

    task_id = task.id
    agent_id = job.agent_id

    from agents.runtime import AgentRuntime

    async def _fire():
        runtime = AgentRuntime(agent_id)
        async for _ in runtime.run_task(task_id):
            pass

    asyncio.create_task(_fire())

    return {"task_id": task_id}
