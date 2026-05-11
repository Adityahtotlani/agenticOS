from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from database import Base
import datetime


class Attachment(Base):
    __tablename__ = "attachments"
    id = Column(Integer, primary_key=True)
    task_id = Column(Integer, ForeignKey("tasks.id"), nullable=False)
    filename = Column(String, nullable=False)
    mime_type = Column(String, nullable=False)
    filepath = Column(String, nullable=False)  # absolute path on disk
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
