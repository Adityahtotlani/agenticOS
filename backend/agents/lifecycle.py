from database import SessionLocal
from models import Agent


def spawn_agent(name: str, model: str = "claude-sonnet-4-6", parent_id: int = None) -> Agent:
    """Spawn a new agent."""
    db = SessionLocal()
    try:
        agent = Agent(
            name=name,
            model=model,
            parent_id=parent_id,
            status="idle"
        )
        db.add(agent)
        db.commit()
        db.refresh(agent)
        return agent
    finally:
        db.close()


def get_agent(agent_id: int) -> Agent:
    """Get an agent by ID."""
    db = SessionLocal()
    try:
        return db.query(Agent).filter(Agent.id == agent_id).first()
    finally:
        db.close()


def list_agents() -> list:
    """List all agents."""
    db = SessionLocal()
    try:
        return db.query(Agent).all()
    finally:
        db.close()


def delete_agent(agent_id: int):
    """Delete an agent."""
    db = SessionLocal()
    try:
        agent = db.query(Agent).filter(Agent.id == agent_id).first()
        if agent:
            db.delete(agent)
            db.commit()
    finally:
        db.close()
