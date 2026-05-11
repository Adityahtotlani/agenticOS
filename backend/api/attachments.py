import os
import shutil
import base64
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from database import get_db
from models.attachment import Attachment

ATTACHMENTS_DIR = os.environ.get("ATTACHMENTS_DIR", "/app/data/attachments")
os.makedirs(ATTACHMENTS_DIR, exist_ok=True)

router = APIRouter(tags=["attachments"])

ALLOWED_MIME_PREFIXES = ("image/",)


@router.post("/api/tasks/{task_id}/attachments")
async def upload_attachment(task_id: int, file: UploadFile = File(...), db: Session = Depends(get_db)):
    if not any(file.content_type.startswith(p) for p in ALLOWED_MIME_PREFIXES):
        raise HTTPException(400, "Only image files are supported")

    dest_dir = os.path.join(ATTACHMENTS_DIR, str(task_id))
    os.makedirs(dest_dir, exist_ok=True)
    filepath = os.path.join(dest_dir, file.filename)

    with open(filepath, "wb") as f:
        shutil.copyfileobj(file.file, f)

    attachment = Attachment(
        task_id=task_id,
        filename=file.filename,
        mime_type=file.content_type,
        filepath=filepath,
    )
    db.add(attachment)
    db.commit()
    db.refresh(attachment)
    return {"id": attachment.id, "filename": attachment.filename, "mime_type": attachment.mime_type}


@router.get("/api/tasks/{task_id}/attachments")
def list_attachments(task_id: int, db: Session = Depends(get_db)):
    rows = db.query(Attachment).filter(Attachment.task_id == task_id).all()
    return [{"id": r.id, "filename": r.filename, "mime_type": r.mime_type} for r in rows]


@router.delete("/api/attachments/{attachment_id}")
def delete_attachment(attachment_id: int, db: Session = Depends(get_db)):
    att = db.query(Attachment).filter(Attachment.id == attachment_id).first()
    if not att:
        raise HTTPException(404, "Not found")
    try:
        os.remove(att.filepath)
    except FileNotFoundError:
        pass
    db.delete(att)
    db.commit()
    return {"ok": True}


@router.get("/api/attachments/{attachment_id}/data")
def get_attachment_data(attachment_id: int, db: Session = Depends(get_db)):
    """Returns base64-encoded image data for display in frontend."""
    att = db.query(Attachment).filter(Attachment.id == attachment_id).first()
    if not att:
        raise HTTPException(404, "Not found")
    with open(att.filepath, "rb") as f:
        data = base64.b64encode(f.read()).decode()
    return {"data": data, "mime_type": att.mime_type, "filename": att.filename}
