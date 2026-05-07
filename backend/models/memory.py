from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from datetime import datetime
from database import Base


class Memory(Base):
    __tablename__ = "memories"

    id = Column(Integer, primary_key=True, index=True)
    agent_id = Column(Integer, ForeignKey("agents.id"), index=True)
    role = Column(String)  # user, assistant, tool
    content = Column(Text)
    type = Column(String, default="short_term")  # short_term, long_term
    created_at = Column(DateTime, default=datetime.utcnow, index=True)

    # Relationships
    agent = relationship("Agent", back_populates="memory")
