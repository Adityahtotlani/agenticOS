from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List
from database import get_db
from models import Agent
from agents import spawn_agent, list_agents as list_all_agents, get_agent, delete_agent

router = APIRouter(prefix="/api/agents", tags=["agents"])


class AgentCreate(BaseModel):
    name: str
    model: str = "claude-sonnet-4-6"
    parent_id: int = None
    system_prompt: str = None
    knowledge_base_id: int = None
    mcp_server_ids: List[int] = []


class AgentResponse(BaseModel):
    id: int
    name: str
    model: str
    status: str
    parent_id: int = None
    system_prompt: str = None
    knowledge_base_id: int = None
    mcp_server_ids: List[int] = []

    class Config:
        from_attributes = True


@router.get("/", response_model=List[AgentResponse])
def list_agents_endpoint(db: Session = Depends(get_db)):
    agents = db.query(Agent).all()
    return agents


@router.post("/", response_model=AgentResponse)
def create_agent(agent_in: AgentCreate, db: Session = Depends(get_db)):
    kwargs = {
        "name": agent_in.name,
        "model": agent_in.model,
        "parent_id": agent_in.parent_id,
        "knowledge_base_id": agent_in.knowledge_base_id,
        "mcp_server_ids": agent_in.mcp_server_ids or [],
        "status": "idle",
    }
    if agent_in.system_prompt:
        kwargs["system_prompt"] = agent_in.system_prompt
    agent = Agent(**kwargs)
    db.add(agent)
    db.commit()
    db.refresh(agent)
    return agent


@router.get("/{agent_id}", response_model=AgentResponse)
def get_agent_endpoint(agent_id: int, db: Session = Depends(get_db)):
    agent = db.query(Agent).filter(Agent.id == agent_id).first()
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    return agent


@router.delete("/{agent_id}")
def delete_agent_endpoint(agent_id: int, db: Session = Depends(get_db)):
    agent = db.query(Agent).filter(Agent.id == agent_id).first()
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    db.delete(agent)
    db.commit()
    return {"ok": True}


@router.post("/{agent_id}/pause")
def pause_agent(agent_id: int, db: Session = Depends(get_db)):
    agent = db.query(Agent).filter(Agent.id == agent_id).first()
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    agent.status = "paused"
    db.commit()
    return {"ok": True}


@router.post("/{agent_id}/kill")
def kill_agent(agent_id: int, db: Session = Depends(get_db)):
    agent = db.query(Agent).filter(Agent.id == agent_id).first()
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    agent.status = "dead"
    db.commit()
    return {"ok": True}


@router.get("/{agent_id}/children", response_model=List[AgentResponse])
def get_agent_children(agent_id: int, db: Session = Depends(get_db)):
    children = db.query(Agent).filter(Agent.parent_id == agent_id).all()
    return children
