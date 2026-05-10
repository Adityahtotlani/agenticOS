from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey
from database import Base
import datetime


class ScheduledJob(Base):
    __tablename__ = "scheduled_jobs"
    id = Column(Integer, primary_key=True)
    name = Column(String, nullable=False)
    agent_id = Column(Integer, ForeignKey("agents.id"), nullable=False)
    cron_expr = Column(String, nullable=False)  # e.g. "0 9 * * 1-5"
    task_title = Column(String, nullable=False)
    task_description = Column(String, default="")
    enabled = Column(Boolean, default=True)
    webhook_token = Column(String, unique=True, nullable=True)  # for webhook trigger
    last_run_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
