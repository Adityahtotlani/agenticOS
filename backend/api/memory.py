from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from database import get_db
from models import Memory

router = APIRouter(prefix="/api/memory", tags=["memory"])


class MemoryResponse:
    def __init__(self, id: int, agent_id: int, role: str, content: str, type: str, created_at: str):
        self.id = id
        self.agent_id = agent_id
        self.role = role
        self.content = content
        self.type = type
        self.created_at = created_at.isoformat() if hasattr(created_at, 'isoformat') else str(created_at)


@router.get("/{agent_id}")
def get_agent_memory(
    agent_id: int,
    type: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    """Get memory for an agent, optionally filtered by type."""
    query = db.query(Memory).filter(Memory.agent_id == agent_id)

    if type:
        query = query.filter(Memory.type == type)

    memories = query.order_by(Memory.created_at.desc()).all()

    return [
        {
            "id": m.id,
            "agent_id": m.agent_id,
            "role": m.role,
            "content": m.content,
            "type": m.type,
            "created_at": m.created_at.isoformat()
        }
        for m in memories
    ]


@router.delete("/{memory_id}")
def delete_memory(memory_id: int, db: Session = Depends(get_db)):
    """Delete a memory entry."""
    memory = db.query(Memory).filter(Memory.id == memory_id).first()
    if not memory:
        raise HTTPException(status_code=404, detail="Memory not found")

    db.delete(memory)
    db.commit()
    return {"ok": True}
