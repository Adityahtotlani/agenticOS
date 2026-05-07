from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Optional
from database import get_db
from models import Task, Agent

router = APIRouter(prefix="/api/tasks", tags=["tasks"])


class TaskCreate(BaseModel):
    title: str
    description: str
    agent_id: Optional[int] = None


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
    result: Optional[str]

    class Config:
        from_attributes = True


@router.get("/", response_model=List[TaskResponse])
def list_tasks(db: Session = Depends(get_db)):
    return db.query(Task).all()


@router.post("/", response_model=TaskResponse)
def create_task(task_in: TaskCreate, db: Session = Depends(get_db)):
    task = Task(
        title=task_in.title,
        description=task_in.description,
        agent_id=task_in.agent_id,
        status="pending"
    )
    db.add(task)
    db.commit()
    db.refresh(task)
    return task


@router.get("/{task_id}", response_model=TaskResponse)
def get_task(task_id: int, db: Session = Depends(get_db)):
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    return task


@router.put("/{task_id}", response_model=TaskResponse)
def update_task(task_id: int, task_in: TaskUpdate, db: Session = Depends(get_db)):
    task = db.query(Task).filter(Task.id == task_id).first()
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


@router.delete("/{task_id}")
def delete_task(task_id: int, db: Session = Depends(get_db)):
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    db.delete(task)
    db.commit()
    return {"ok": True}
