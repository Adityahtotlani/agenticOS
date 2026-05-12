import json
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Optional
from database import get_db
from models import Agent
from models.mcp_server import MCPServer
from models.user import User
from agents import spawn_agent, list_agents as list_all_agents, get_agent, delete_agent
from auth import get_current_user

router = APIRouter(prefix="/api/agents", tags=["agents"])


class AgentCreate(BaseModel):
    name: str
    model: str = "claude-sonnet-4-6"
    parent_id: int = None
    system_prompt: str = None
    knowledge_base_id: int = None
    mcp_server_ids: List[int] = []
    budget_usd: float | None = None


class AgentResponse(BaseModel):
    id: int
    name: str
    model: str
    status: str
    parent_id: int = None
    system_prompt: str = None
    knowledge_base_id: int = None
    mcp_server_ids: List[int] = []
    budget_usd: float | None = None
    spent_usd: float = 0.0

    class Config:
        from_attributes = True


@router.get("/", response_model=List[AgentResponse])
def list_agents_endpoint(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    agents = db.query(Agent).filter(Agent.owner_id == current_user.id).all()
    return agents


@router.post("/", response_model=AgentResponse)
def create_agent(agent_in: AgentCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    kwargs = {
        "name": agent_in.name,
        "model": agent_in.model,
        "parent_id": agent_in.parent_id,
        "knowledge_base_id": agent_in.knowledge_base_id,
        "mcp_server_ids": agent_in.mcp_server_ids or [],
        "budget_usd": agent_in.budget_usd,
        "status": "idle",
        "owner_id": current_user.id,
    }
    if agent_in.system_prompt:
        kwargs["system_prompt"] = agent_in.system_prompt
    agent = Agent(**kwargs)
    db.add(agent)
    db.commit()
    db.refresh(agent)
    return agent


@router.get("/{agent_id}", response_model=AgentResponse)
def get_agent_endpoint(agent_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    agent = db.query(Agent).filter(Agent.id == agent_id, Agent.owner_id == current_user.id).first()
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    return agent


@router.delete("/{agent_id}")
def delete_agent_endpoint(agent_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    agent = db.query(Agent).filter(Agent.id == agent_id, Agent.owner_id == current_user.id).first()
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    db.delete(agent)
    db.commit()
    return {"ok": True}


class AgentBudgetUpdate(BaseModel):
    budget_usd: float | None = None


@router.patch("/{agent_id}/budget", response_model=AgentResponse)
def update_agent_budget(agent_id: int, payload: AgentBudgetUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    agent = db.query(Agent).filter(Agent.id == agent_id, Agent.owner_id == current_user.id).first()
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    agent.budget_usd = payload.budget_usd
    db.commit()
    db.refresh(agent)
    return agent


@router.post("/{agent_id}/pause")
def pause_agent(agent_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    agent = db.query(Agent).filter(Agent.id == agent_id, Agent.owner_id == current_user.id).first()
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    agent.status = "paused"
    db.commit()
    return {"ok": True}


@router.post("/{agent_id}/kill")
def kill_agent(agent_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    agent = db.query(Agent).filter(Agent.id == agent_id, Agent.owner_id == current_user.id).first()
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    agent.status = "dead"
    db.commit()
    return {"ok": True}


@router.get("/{agent_id}/children", response_model=List[AgentResponse])
def get_agent_children(agent_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    # verify parent belongs to user
    parent = db.query(Agent).filter(Agent.id == agent_id, Agent.owner_id == current_user.id).first()
    if not parent:
        raise HTTPException(status_code=404, detail="Agent not found")
    children = db.query(Agent).filter(Agent.parent_id == agent_id).all()
    return children


@router.get("/{agent_id}/export")
def export_agent(agent_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    agent = db.query(Agent).filter(Agent.id == agent_id, Agent.owner_id == current_user.id).first()
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")

    mcp_names = []
    if agent.mcp_server_ids:
        ids = agent.mcp_server_ids if isinstance(agent.mcp_server_ids, list) else json.loads(agent.mcp_server_ids)
        servers = db.query(MCPServer).filter(MCPServer.id.in_(ids)).all()
        mcp_names = [s.name for s in servers]

    bundle = {
        "agentios_export_version": 1,
        "name": agent.name,
        "model": agent.model,
        "system_prompt": agent.system_prompt or "",
        "budget_usd": agent.budget_usd,
        "mcp_server_names": mcp_names,
    }
    return bundle


class AgentImportPayload(BaseModel):
    agentios_export_version: int = 1
    name: str
    model: str = "claude-sonnet-4-6"
    system_prompt: str = ""
    budget_usd: Optional[float] = None
    mcp_server_names: List[str] = []


@router.post("/import", response_model=AgentResponse)
def import_agent(payload: AgentImportPayload, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    mcp_ids = []
    for name in payload.mcp_server_names:
        server = db.query(MCPServer).filter(func.lower(MCPServer.name) == name.lower()).first()
        if server:
            mcp_ids.append(server.id)

    agent = Agent(
        name=payload.name,
        model=payload.model,
        system_prompt=payload.system_prompt or None,
        budget_usd=payload.budget_usd,
        mcp_server_ids=mcp_ids if mcp_ids else None,
        status="idle",
        owner_id=current_user.id,
    )
    db.add(agent)
    db.commit()
    db.refresh(agent)
    return agent
