from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List

from database import get_db
from models import KnowledgeBase, Document
from rag import chunk_text, vector_store

router = APIRouter(prefix="/api/knowledge-bases", tags=["knowledge-bases"])


class KnowledgeBaseCreate(BaseModel):
    name: str
    description: str = ""


class KnowledgeBaseResponse(BaseModel):
    id: int
    name: str
    description: str
    document_count: int = 0

    class Config:
        from_attributes = True


class DocumentResponse(BaseModel):
    id: int
    kb_id: int
    filename: str
    chunks_count: int

    class Config:
        from_attributes = True


@router.get("", response_model=List[KnowledgeBaseResponse])
def list_knowledge_bases(db: Session = Depends(get_db)):
    kbs = db.query(KnowledgeBase).all()
    return [
        KnowledgeBaseResponse(
            id=kb.id,
            name=kb.name,
            description=kb.description or "",
            document_count=len(kb.documents),
        )
        for kb in kbs
    ]


@router.post("", response_model=KnowledgeBaseResponse)
def create_knowledge_base(kb_in: KnowledgeBaseCreate, db: Session = Depends(get_db)):
    kb = KnowledgeBase(name=kb_in.name, description=kb_in.description)
    db.add(kb)
    db.commit()
    db.refresh(kb)
    return KnowledgeBaseResponse(id=kb.id, name=kb.name, description=kb.description or "", document_count=0)


@router.get("/{kb_id}", response_model=KnowledgeBaseResponse)
def get_knowledge_base(kb_id: int, db: Session = Depends(get_db)):
    kb = db.query(KnowledgeBase).filter(KnowledgeBase.id == kb_id).first()
    if not kb:
        raise HTTPException(status_code=404, detail="Knowledge base not found")
    return KnowledgeBaseResponse(
        id=kb.id, name=kb.name, description=kb.description or "", document_count=len(kb.documents)
    )


@router.delete("/{kb_id}")
def delete_knowledge_base(kb_id: int, db: Session = Depends(get_db)):
    kb = db.query(KnowledgeBase).filter(KnowledgeBase.id == kb_id).first()
    if not kb:
        raise HTTPException(status_code=404, detail="Knowledge base not found")
    vector_store.delete_collection(kb_id)
    db.delete(kb)
    db.commit()
    return {"ok": True}


@router.get("/{kb_id}/documents", response_model=List[DocumentResponse])
def list_documents(kb_id: int, db: Session = Depends(get_db)):
    kb = db.query(KnowledgeBase).filter(KnowledgeBase.id == kb_id).first()
    if not kb:
        raise HTTPException(status_code=404, detail="Knowledge base not found")
    return kb.documents


@router.post("/{kb_id}/documents", response_model=DocumentResponse)
async def upload_document(kb_id: int, file: UploadFile = File(...), db: Session = Depends(get_db)):
    kb = db.query(KnowledgeBase).filter(KnowledgeBase.id == kb_id).first()
    if not kb:
        raise HTTPException(status_code=404, detail="Knowledge base not found")

    raw = await file.read()
    try:
        text = raw.decode("utf-8")
    except UnicodeDecodeError:
        raise HTTPException(status_code=400, detail="File must be UTF-8 text (txt, md, json, csv, etc.)")

    document = Document(kb_id=kb_id, filename=file.filename or "untitled", content=text, chunks_count=0)
    db.add(document)
    db.commit()
    db.refresh(document)

    chunks = chunk_text(text)
    written = vector_store.add_chunks(kb_id, document.id, chunks)
    document.chunks_count = written
    db.commit()
    db.refresh(document)
    return document


@router.delete("/{kb_id}/documents/{document_id}")
def delete_document(kb_id: int, document_id: int, db: Session = Depends(get_db)):
    document = (
        db.query(Document)
        .filter(Document.id == document_id, Document.kb_id == kb_id)
        .first()
    )
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")
    vector_store.delete_document(kb_id, document_id)
    db.delete(document)
    db.commit()
    return {"ok": True}
