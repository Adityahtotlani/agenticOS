from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from config import settings
from database import Base, engine, apply_lightweight_migrations, SessionLocal
from api import agents, tasks, ws, memory, templates, knowledge_bases, mcp_servers, metrics, attachments
from api import scheduled_jobs as scheduled_jobs_router
from api import workflows as workflows_router
from models import Agent, Task, Memory, KnowledgeBase, Document, MCPServer, AgentRun, ScheduledJob
from models import Workflow, WorkflowStep, WorkflowRun, WorkflowStepRun
from scheduler import scheduler
from apscheduler.triggers.cron import CronTrigger

# Create tables and apply additive column migrations for upgraded DBs
Base.metadata.create_all(bind=engine)
apply_lightweight_migrations()


def _cron_trigger(cron_expr: str) -> CronTrigger:
    parts = cron_expr.strip().split()
    minute, hour, day, month, day_of_week = parts
    return CronTrigger(
        minute=minute,
        hour=hour,
        day=day,
        month=month,
        day_of_week=day_of_week,
    )


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Load all enabled scheduled jobs into APScheduler on startup
    from api.scheduled_jobs import _run_scheduled_job
    db = SessionLocal()
    try:
        jobs = db.query(ScheduledJob).filter(ScheduledJob.enabled == True).all()
        for job in jobs:
            try:
                trigger = _cron_trigger(job.cron_expr)
                scheduler.add_job(
                    _run_scheduled_job,
                    trigger=trigger,
                    id=f"job_{job.id}",
                    args=[job.id],
                    replace_existing=True,
                )
            except Exception:
                pass
    finally:
        db.close()

    import os
    os.makedirs("/app/data/attachments", exist_ok=True)

    scheduler.start()
    yield
    scheduler.shutdown()


app = FastAPI(
    title="AgenticOS",
    description="Operating System for AI Agents",
    lifespan=lifespan,
)

# CORS
allowed_origins = [origin.strip() for origin in settings.allowed_origins.split(",")]
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(agents.router)
app.include_router(tasks.router)
app.include_router(memory.router)
app.include_router(templates.router)
app.include_router(knowledge_bases.router)
app.include_router(mcp_servers.router)
app.include_router(metrics.router)
app.include_router(ws.router)
app.include_router(scheduled_jobs_router.router)
app.include_router(attachments.router)
app.include_router(workflows_router.router)


@app.get("/health")
def health():
    return {"status": "ok"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
