from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Optional
from database import get_db
from models import Task, Agent
from models.user import User
from auth import get_current_user

router = APIRouter(prefix="/api/tasks", tags=["tasks"])


class TaskCreate(BaseModel):
    title: str
    description: str
    agent_id: Optional[int] = None
    parent_task_id: Optional[int] = None


class TaskUpdate(BaseModel):
    status: Optional[str] = None
    agent_id: Optional[int] = None
    result: Optional[str] = None


class TaskResponse(BaseModel):
    id: int
    title: str
    description: str
    status: str
    agent_id: Optional[int]
    parent_task_id: Optional[int]
    result: Optional[str]

    class Config:
        from_attributes = True


@router.get("/", response_model=List[TaskResponse])
def list_tasks(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    # return tasks whose agent belongs to current user (or unassigned tasks created by current user)
    tasks = (
        db.query(Task)
        .outerjoin(Agent, Task.agent_id == Agent.id)
        .filter(
            (Agent.owner_id == current_user.id) | (Task.agent_id == None)
        )
        .all()
    )
    return tasks


@router.post("/", response_model=TaskResponse)
def create_task(task_in: TaskCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if task_in.agent_id is not None:
        agent = db.query(Agent).filter(Agent.id == task_in.agent_id, Agent.owner_id == current_user.id).first()
        if not agent:
            raise HTTPException(status_code=404, detail="Agent not found")
    task = Task(
        title=task_in.title,
        description=task_in.description,
        agent_id=task_in.agent_id,
        parent_task_id=task_in.parent_task_id,
        status="pending"
    )
    db.add(task)
    db.commit()
    db.refresh(task)
    return task


@router.get("/{task_id}", response_model=TaskResponse)
def get_task(task_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    task = (
        db.query(Task)
        .outerjoin(Agent, Task.agent_id == Agent.id)
        .filter(
            Task.id == task_id,
            (Agent.owner_id == current_user.id) | (Task.agent_id == None)
        )
        .first()
    )
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    return task


@router.put("/{task_id}", response_model=TaskResponse)
def update_task(task_id: int, task_in: TaskUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    task = (
        db.query(Task)
        .outerjoin(Agent, Task.agent_id == Agent.id)
        .filter(
            Task.id == task_id,
            (Agent.owner_id == current_user.id) | (Task.agent_id == None)
        )
        .first()
    )
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    if task_in.status:
        task.status = task_in.status
    if task_in.agent_id:
        task.agent_id = task_in.agent_id
    if task_in.result:
        task.result = task_in.result

    db.commit()
    db.refresh(task)
    return task


@router.get("/{task_id}/subtasks", response_model=List[TaskResponse])
def get_task_subtasks(task_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    subtasks = db.query(Task).filter(Task.parent_task_id == task_id).all()
    return subtasks


@router.delete("/{task_id}")
def delete_task(task_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    task = (
        db.query(Task)
        .outerjoin(Agent, Task.agent_id == Agent.id)
        .filter(
            Task.id == task_id,
            (Agent.owner_id == current_user.id) | (Task.agent_id == None)
        )
        .first()
    )
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    db.delete(task)
    db.commit()
    return {"ok": True}
