from sqlalchemy import Column, Integer, String, DateTime, Boolean, JSON, Text
from datetime import datetime
from database import Base


class MCPServer(Base):
    __tablename__ = "mcp_servers"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True, nullable=False)
    description = Column(Text, default="")
    command = Column(String, nullable=False)
    args = Column(JSON, default=list)  # list[str]
    env = Column(JSON, default=dict)   # dict[str, str]
    enabled = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
