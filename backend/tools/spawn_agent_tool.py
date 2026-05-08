import json
import asyncio
from database import SessionLocal
from models import Agent, Task
from agents import spawn_agent, get_agent_runtime


async def spawn_child_agent(
    name: str,
    task_title: str,
    task_description: str,
    parent_agent_id: int,
    parent_task_id: int
) -> str:
    """
    Spawn a child agent to work on a subtask.
    This is called by the parent agent during task execution.
    """
    try:
        db = SessionLocal()
        try:
            # Create child agent
            child = spawn_agent(
                name=name,
                model="claude-sonnet-4-6",
                parent_id=parent_agent_id
            )

            # Create subtask
            subtask = Task(
                title=task_title,
                description=task_description,
                agent_id=child.id,
                parent_task_id=parent_task_id,
                status="pending"
            )
            db.add(subtask)
            db.commit()

            # Get agent runtime and start it in background
            child_runtime = get_agent_runtime(child.id)
            asyncio.create_task(child_runtime.run_task(subtask.id))

            return json.dumps({
                "success": True,
                "child_agent_id": child.id,
                "child_agent_name": child.name,
                "task_id": subtask.id,
                "message": f"Spawned child agent {child.name} (ID: {child.id}) to work on subtask"
            })
        finally:
            db.close()
    except Exception as e:
        return json.dumps({
            "success": False,
            "error": str(e)
        })
