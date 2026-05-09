from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text, JSON
from sqlalchemy.orm import relationship
from datetime import datetime
from database import Base


class Agent(Base):
    __tablename__ = "agents"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    model = Column(String, default="claude-sonnet-4-6")
    status = Column(String, default="idle")  # idle, running, paused, dead
    parent_id = Column(Integer, ForeignKey("agents.id"), nullable=True)
    system_prompt = Column(Text, default="You are a helpful AI agent.")
    knowledge_base_id = Column(Integer, ForeignKey("knowledge_bases.id"), nullable=True)
    mcp_server_ids = Column(JSON, default=list)  # list[int]
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    tasks = relationship("Task", back_populates="agent")
    memory = relationship("Memory", back_populates="agent")
    children = relationship("Agent", remote_side=[parent_id])
