from typing import Any, Dict, List, Optional
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func

from database import get_db
from models import AgentRun, Agent
from models.user import User
from auth import get_current_user

router = APIRouter(prefix="/api/metrics", tags=["metrics"])


def _since(days: int) -> datetime:
    return datetime.utcnow() - timedelta(days=days)


@router.get("/summary")
def summary(days: int = Query(30, ge=1, le=365), db: Session = Depends(get_db), current_user: User = Depends(get_current_user)) -> Dict[str, Any]:
    cutoff = _since(days)
    base = (
        db.query(AgentRun)
        .join(Agent, AgentRun.agent_id == Agent.id)
        .filter(AgentRun.started_at >= cutoff, Agent.owner_id == current_user.id)
    )
    total_runs = base.count()
    total_errors = base.filter(AgentRun.error.isnot(None)).count()
    agg = (
        db.query(
            func.coalesce(func.sum(AgentRun.cost_usd), 0.0),
            func.coalesce(func.sum(AgentRun.input_tokens), 0),
            func.coalesce(func.sum(AgentRun.output_tokens), 0),
            func.coalesce(func.sum(AgentRun.cache_read_tokens), 0),
            func.coalesce(func.avg(AgentRun.latency_ms), 0.0),
        )
        .join(Agent, AgentRun.agent_id == Agent.id)
        .filter(AgentRun.started_at >= cutoff, Agent.owner_id == current_user.id)
        .one()
    )
    cost, input_tokens, output_tokens, cache_read, avg_latency = agg
    return {
        "days": days,
        "total_runs": total_runs,
        "total_errors": total_errors,
        "error_rate": round(total_errors / total_runs, 4) if total_runs else 0.0,
        "total_cost_usd": round(float(cost or 0.0), 6),
        "total_input_tokens": int(input_tokens or 0),
        "total_output_tokens": int(output_tokens or 0),
        "total_cache_read_tokens": int(cache_read or 0),
        "avg_latency_ms": int(avg_latency or 0),
    }


@router.get("/by-agent")
def by_agent(days: int = Query(30, ge=1, le=365), db: Session = Depends(get_db), current_user: User = Depends(get_current_user)) -> List[Dict[str, Any]]:
    cutoff = _since(days)
    rows = (
        db.query(
            AgentRun.agent_id,
            func.count(AgentRun.id),
            func.coalesce(func.sum(AgentRun.cost_usd), 0.0),
            func.coalesce(func.sum(AgentRun.input_tokens + AgentRun.output_tokens), 0),
            func.coalesce(func.avg(AgentRun.latency_ms), 0.0),
        )
        .join(Agent, AgentRun.agent_id == Agent.id)
        .filter(AgentRun.started_at >= cutoff, Agent.owner_id == current_user.id)
        .group_by(AgentRun.agent_id)
        .all()
    )
    agent_names = {a.id: a.name for a in db.query(Agent).filter(Agent.owner_id == current_user.id).all()}
    out = []
    for agent_id, runs, cost, tokens, avg_latency in rows:
        out.append({
            "agent_id": agent_id,
            "agent_name": agent_names.get(agent_id, f"Agent {agent_id}"),
            "runs": int(runs or 0),
            "cost_usd": round(float(cost or 0.0), 6),
            "tokens": int(tokens or 0),
            "avg_latency_ms": int(avg_latency or 0),
        })
    out.sort(key=lambda r: r["cost_usd"], reverse=True)
    return out


@router.get("/timeseries")
def timeseries(
    days: int = Query(30, ge=1, le=365),
    bucket: str = Query("day", regex="^(hour|day)$"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> List[Dict[str, Any]]:
    """Cost + run count bucketed by hour or day. SQLite-friendly via strftime."""
    cutoff = _since(days)
    fmt = "%Y-%m-%d %H:00" if bucket == "hour" else "%Y-%m-%d"
    bucket_expr = func.strftime(fmt, AgentRun.started_at)
    rows = (
        db.query(
            bucket_expr.label("bucket"),
            func.count(AgentRun.id),
            func.coalesce(func.sum(AgentRun.cost_usd), 0.0),
        )
        .join(Agent, AgentRun.agent_id == Agent.id)
        .filter(AgentRun.started_at >= cutoff, Agent.owner_id == current_user.id)
        .group_by(bucket_expr)
        .order_by(bucket_expr)
        .all()
    )
    return [
        {"bucket": b, "runs": int(r or 0), "cost_usd": round(float(c or 0.0), 6)}
        for b, r, c in rows
    ]


@router.get("/recent-runs")
def recent_runs(
    limit: int = Query(50, ge=1, le=500),
    agent_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> List[Dict[str, Any]]:
    q = (
        db.query(AgentRun)
        .join(Agent, AgentRun.agent_id == Agent.id)
        .filter(Agent.owner_id == current_user.id)
        .order_by(AgentRun.id.desc())
    )
    if agent_id is not None:
        q = q.filter(AgentRun.agent_id == agent_id)
    rows = q.limit(limit).all()
    agent_names = {a.id: a.name for a in db.query(Agent).filter(Agent.owner_id == current_user.id).all()}
    return [
        {
            "id": r.id,
            "agent_id": r.agent_id,
            "agent_name": agent_names.get(r.agent_id, f"Agent {r.agent_id}"),
            "task_id": r.task_id,
            "model": r.model,
            "started_at": r.started_at.isoformat() if r.started_at else None,
            "latency_ms": r.latency_ms,
            "input_tokens": r.input_tokens,
            "output_tokens": r.output_tokens,
            "cost_usd": r.cost_usd,
            "stop_reason": r.stop_reason,
            "error": r.error,
        }
        for r in rows
    ]
