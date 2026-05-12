import asyncio
import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from database import get_db, SessionLocal
from models.workflow import Workflow, WorkflowStep, WorkflowRun, WorkflowStepRun
from models import Task, Agent

router = APIRouter(tags=["workflows"])

# --- Pydantic schemas ---


class StepIn(BaseModel):
    agent_id: int
    task_title: str
    task_description: str = ""


class WorkflowCreate(BaseModel):
    name: str
    description: str = ""
    steps: List[StepIn] = []


class WorkflowUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    steps: Optional[List[StepIn]] = None  # full replacement of steps


class StepOut(BaseModel):
    id: int
    step_order: int
    agent_id: int
    task_title: str
    task_description: str

    class Config:
        from_attributes = True


class WorkflowOut(BaseModel):
    id: int
    name: str
    description: str
    created_at: Optional[datetime.datetime]
    steps: List[StepOut] = []

    class Config:
        from_attributes = True


class StepRunOut(BaseModel):
    id: int
    step_id: int
    task_id: Optional[int]
    status: str
    started_at: Optional[datetime.datetime]
    ended_at: Optional[datetime.datetime]
    error: Optional[str]

    class Config:
        from_attributes = True


class RunOut(BaseModel):
    id: int
    workflow_id: int
    status: str
    started_at: Optional[datetime.datetime]
    ended_at: Optional[datetime.datetime]
    step_runs: List[StepRunOut] = []

    class Config:
        from_attributes = True


# --- Helpers ---


def _get_steps(workflow_id: int, db: Session):
    return (
        db.query(WorkflowStep)
        .filter(WorkflowStep.workflow_id == workflow_id)
        .order_by(WorkflowStep.step_order)
        .all()
    )


def _workflow_out(w: Workflow, db: Session) -> dict:
    steps = _get_steps(w.id, db)
    return {
        "id": w.id,
        "name": w.name,
        "description": w.description,
        "created_at": w.created_at,
        "steps": [
            {
                "id": s.id,
                "step_order": s.step_order,
                "agent_id": s.agent_id,
                "task_title": s.task_title,
                "task_description": s.task_description,
            }
            for s in steps
        ],
    }


def _run_out(run: WorkflowRun, db: Session) -> dict:
    step_runs = db.query(WorkflowStepRun).filter(WorkflowStepRun.run_id == run.id).all()
    return {
        "id": run.id,
        "workflow_id": run.workflow_id,
        "status": run.status,
        "started_at": run.started_at,
        "ended_at": run.ended_at,
        "step_runs": [
            {
                "id": sr.id,
                "step_id": sr.step_id,
                "task_id": sr.task_id,
                "status": sr.status,
                "started_at": sr.started_at,
                "ended_at": sr.ended_at,
                "error": sr.error,
            }
            for sr in step_runs
        ],
    }


# --- Routes ---


@router.get("/api/workflows")
def list_workflows(db: Session = Depends(get_db)):
    workflows = db.query(Workflow).all()
    return [_workflow_out(w, db) for w in workflows]


@router.get("/api/workflows/{workflow_id}")
def get_workflow(workflow_id: int, db: Session = Depends(get_db)):
    w = db.query(Workflow).filter(Workflow.id == workflow_id).first()
    if not w:
        raise HTTPException(404, "Not found")
    return _workflow_out(w, db)


@router.post("/api/workflows")
def create_workflow(payload: WorkflowCreate, db: Session = Depends(get_db)):
    w = Workflow(name=payload.name, description=payload.description)
    db.add(w)
    db.flush()
    for i, s in enumerate(payload.steps):
        db.add(
            WorkflowStep(
                workflow_id=w.id,
                step_order=i,
                agent_id=s.agent_id,
                task_title=s.task_title,
                task_description=s.task_description,
            )
        )
    db.commit()
    db.refresh(w)
    return _workflow_out(w, db)


@router.put("/api/workflows/{workflow_id}")
def update_workflow(workflow_id: int, payload: WorkflowUpdate, db: Session = Depends(get_db)):
    w = db.query(Workflow).filter(Workflow.id == workflow_id).first()
    if not w:
        raise HTTPException(404, "Not found")
    if payload.name is not None:
        w.name = payload.name
    if payload.description is not None:
        w.description = payload.description
    if payload.steps is not None:
        db.query(WorkflowStep).filter(WorkflowStep.workflow_id == workflow_id).delete()
        for i, s in enumerate(payload.steps):
            db.add(
                WorkflowStep(
                    workflow_id=workflow_id,
                    step_order=i,
                    agent_id=s.agent_id,
                    task_title=s.task_title,
                    task_description=s.task_description,
                )
            )
    db.commit()
    return _workflow_out(w, db)


@router.delete("/api/workflows/{workflow_id}")
def delete_workflow(workflow_id: int, db: Session = Depends(get_db)):
    w = db.query(Workflow).filter(Workflow.id == workflow_id).first()
    if not w:
        raise HTTPException(404, "Not found")
    db.query(WorkflowStep).filter(WorkflowStep.workflow_id == workflow_id).delete()
    db.delete(w)
    db.commit()
    return {"ok": True}


@router.get("/api/workflow-runs/{run_id}")
def get_run(run_id: int, db: Session = Depends(get_db)):
    run = db.query(WorkflowRun).filter(WorkflowRun.id == run_id).first()
    if not run:
        raise HTTPException(404, "Not found")
    return _run_out(run, db)


@router.get("/api/workflows/{workflow_id}/runs")
def list_runs(workflow_id: int, db: Session = Depends(get_db)):
    runs = (
        db.query(WorkflowRun)
        .filter(WorkflowRun.workflow_id == workflow_id)
        .order_by(WorkflowRun.id.desc())
        .limit(20)
        .all()
    )
    return [_run_out(r, db) for r in runs]


@router.post("/api/workflows/{workflow_id}/run")
async def trigger_run(workflow_id: int, db: Session = Depends(get_db)):
    steps = _get_steps(workflow_id, db)
    if not steps:
        raise HTTPException(400, "Workflow has no steps")

    run = WorkflowRun(workflow_id=workflow_id, status="running")
    db.add(run)
    db.flush()

    step_runs = []
    for step in steps:
        sr = WorkflowStepRun(run_id=run.id, step_id=step.id, status="pending")
        db.add(sr)
        step_runs.append(sr)
    db.commit()

    run_id = run.id
    step_data = [(s.id, s.agent_id, s.task_title, s.task_description) for s in steps]
    sr_ids = [sr.id for sr in step_runs]

    async def _execute():
        previous_output = ""
        final_status = "completed"

        for (step_id, agent_id, task_title, task_desc), sr_id in zip(step_data, sr_ids):
            db2 = SessionLocal()
            try:
                sr = db2.query(WorkflowStepRun).filter(WorkflowStepRun.id == sr_id).first()
                sr.status = "running"
                sr.started_at = datetime.datetime.utcnow()

                # Interpolate previous output
                description = task_desc.replace("{{previous_output}}", previous_output)

                task = Task(
                    title=task_title,
                    description=description,
                    agent_id=agent_id,
                    status="queued",
                )
                db2.add(task)
                db2.commit()
                db2.refresh(task)

                sr.task_id = task.id
                db2.commit()
                task_id = task.id
            finally:
                db2.close()

            # Run the agent
            from agents.runtime import AgentRuntime

            try:
                runtime = AgentRuntime(agent_id)
                async for _ in runtime.run_task(task_id):
                    pass

                # Fetch result
                db3 = SessionLocal()
                try:
                    t = db3.query(Task).filter(Task.id == task_id).first()
                    previous_output = t.result or "" if t else ""
                    sr2 = db3.query(WorkflowStepRun).filter(WorkflowStepRun.id == sr_id).first()
                    sr2.status = "completed"
                    sr2.ended_at = datetime.datetime.utcnow()
                    db3.commit()
                finally:
                    db3.close()
            except Exception as e:
                db3 = SessionLocal()
                try:
                    sr2 = db3.query(WorkflowStepRun).filter(WorkflowStepRun.id == sr_id).first()
                    sr2.status = "failed"
                    sr2.ended_at = datetime.datetime.utcnow()
                    sr2.error = str(e)
                    db3.commit()
                finally:
                    db3.close()
                final_status = "failed"
                break

        db4 = SessionLocal()
        try:
            run2 = db4.query(WorkflowRun).filter(WorkflowRun.id == run_id).first()
            run2.status = final_status
            run2.ended_at = datetime.datetime.utcnow()
            db4.commit()
        finally:
            db4.close()

    asyncio.create_task(_execute())
    return {"run_id": run_id}
