from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, JSON
from database import Base
import datetime


class Workflow(Base):
    __tablename__ = "workflows"
    id = Column(Integer, primary_key=True)
    name = Column(String, nullable=False)
    description = Column(Text, default="")
    created_at = Column(DateTime, default=datetime.datetime.utcnow)


class WorkflowStep(Base):
    __tablename__ = "workflow_steps"
    id = Column(Integer, primary_key=True)
    workflow_id = Column(Integer, ForeignKey("workflows.id"), nullable=False)
    step_order = Column(Integer, nullable=False)  # 0-indexed
    agent_id = Column(Integer, ForeignKey("agents.id"), nullable=False)
    task_title = Column(String, nullable=False)
    task_description = Column(Text, default="")
    # task_description can contain {{previous_output}} which gets replaced at runtime


class WorkflowRun(Base):
    __tablename__ = "workflow_runs"
    id = Column(Integer, primary_key=True)
    workflow_id = Column(Integer, ForeignKey("workflows.id"), nullable=False)
    status = Column(String, default="running")  # running | completed | failed
    started_at = Column(DateTime, default=datetime.datetime.utcnow)
    ended_at = Column(DateTime, nullable=True)


class WorkflowStepRun(Base):
    __tablename__ = "workflow_step_runs"
    id = Column(Integer, primary_key=True)
    run_id = Column(Integer, ForeignKey("workflow_runs.id"), nullable=False)
    step_id = Column(Integer, ForeignKey("workflow_steps.id"), nullable=False)
    task_id = Column(Integer, ForeignKey("tasks.id"), nullable=True)
    status = Column(String, default="pending")  # pending | running | completed | failed
    started_at = Column(DateTime, nullable=True)
    ended_at = Column(DateTime, nullable=True)
    error = Column(Text, nullable=True)
