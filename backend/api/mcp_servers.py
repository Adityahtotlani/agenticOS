from typing import List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel

from database import get_db
from models import MCPServer
from mcp_client import list_tools_safe
from mcp_client.manager import MCPServerConfig

router = APIRouter(prefix="/api/mcp-servers", tags=["mcp-servers"])


class MCPServerCreate(BaseModel):
    name: str
    description: str = ""
    command: str
    args: List[str] = []
    env: Dict[str, str] = {}
    enabled: bool = True


class MCPServerUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    command: str | None = None
    args: List[str] | None = None
    env: Dict[str, str] | None = None
    enabled: bool | None = None


class MCPServerResponse(BaseModel):
    id: int
    name: str
    description: str
    command: str
    args: List[str]
    env: Dict[str, str]
    enabled: bool

    class Config:
        from_attributes = True


def _to_response(server: MCPServer) -> MCPServerResponse:
    return MCPServerResponse(
        id=server.id,
        name=server.name,
        description=server.description or "",
        command=server.command,
        args=server.args or [],
        env=server.env or {},
        enabled=bool(server.enabled),
    )


@router.get("", response_model=List[MCPServerResponse])
def list_servers(db: Session = Depends(get_db)):
    return [_to_response(s) for s in db.query(MCPServer).all()]


@router.post("", response_model=MCPServerResponse)
def create_server(payload: MCPServerCreate, db: Session = Depends(get_db)):
    server = MCPServer(
        name=payload.name,
        description=payload.description,
        command=payload.command,
        args=payload.args,
        env=payload.env,
        enabled=payload.enabled,
    )
    db.add(server)
    db.commit()
    db.refresh(server)
    return _to_response(server)


@router.get("/{server_id}", response_model=MCPServerResponse)
def get_server(server_id: int, db: Session = Depends(get_db)):
    server = db.query(MCPServer).filter(MCPServer.id == server_id).first()
    if not server:
        raise HTTPException(status_code=404, detail="MCP server not found")
    return _to_response(server)


@router.patch("/{server_id}", response_model=MCPServerResponse)
def update_server(server_id: int, payload: MCPServerUpdate, db: Session = Depends(get_db)):
    server = db.query(MCPServer).filter(MCPServer.id == server_id).first()
    if not server:
        raise HTTPException(status_code=404, detail="MCP server not found")
    data = payload.model_dump(exclude_unset=True)
    for key, value in data.items():
        setattr(server, key, value)
    db.commit()
    db.refresh(server)
    return _to_response(server)


@router.delete("/{server_id}")
def delete_server(server_id: int, db: Session = Depends(get_db)):
    server = db.query(MCPServer).filter(MCPServer.id == server_id).first()
    if not server:
        raise HTTPException(status_code=404, detail="MCP server not found")
    db.delete(server)
    db.commit()
    return {"ok": True}


@router.post("/{server_id}/test")
async def test_server(server_id: int, db: Session = Depends(get_db)) -> Dict[str, Any]:
    server = db.query(MCPServer).filter(MCPServer.id == server_id).first()
    if not server:
        raise HTTPException(status_code=404, detail="MCP server not found")
    cfg = MCPServerConfig(
        id=server.id,
        name=server.name,
        command=server.command,
        args=server.args or [],
        env=server.env or {},
    )
    return await list_tools_safe(cfg)
