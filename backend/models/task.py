from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from datetime import datetime
from database import Base


class Task(Base):
    __tablename__ = "tasks"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, index=True)
    description = Column(Text)
    status = Column(String, default="pending")  # pending, running, done, failed
    agent_id = Column(Integer, ForeignKey("agents.id"), nullable=True)
    parent_task_id = Column(Integer, ForeignKey("tasks.id"), nullable=True, index=True)
    result = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    agent = relationship("Agent", back_populates="tasks")
    subtasks = relationship("Task", remote_side=[id], backref="parent_task")
