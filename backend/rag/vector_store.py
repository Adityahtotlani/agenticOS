import os
from typing import List, Dict, Any
import chromadb
from chromadb.config import Settings as ChromaSettings

from .embedder import embed

CHROMA_PATH = os.environ.get("CHROMA_PATH", "/app/data/chroma")


class VectorStore:
    def __init__(self, path: str = CHROMA_PATH):
        os.makedirs(path, exist_ok=True)
        self._client = chromadb.PersistentClient(
            path=path,
            settings=ChromaSettings(anonymized_telemetry=False),
        )

    def _collection(self, kb_id: int):
        return self._client.get_or_create_collection(
            name=f"kb_{kb_id}",
            metadata={"hnsw:space": "cosine"},
        )

    def add_chunks(self, kb_id: int, document_id: int, chunks: List[str]) -> int:
        if not chunks:
            return 0
        embeddings = embed(chunks)
        ids = [f"doc{document_id}_chunk{i}" for i in range(len(chunks))]
        metadatas = [{"document_id": document_id, "chunk_index": i} for i in range(len(chunks))]
        self._collection(kb_id).add(
            ids=ids,
            embeddings=embeddings,
            documents=chunks,
            metadatas=metadatas,
        )
        return len(chunks)

    def search(self, kb_id: int, query: str, k: int = 5) -> List[Dict[str, Any]]:
        try:
            collection = self._collection(kb_id)
        except Exception:
            return []
        if collection.count() == 0:
            return []
        embeddings = embed([query])
        results = collection.query(
            query_embeddings=embeddings,
            n_results=min(k, collection.count()),
        )
        documents = results.get("documents", [[]])[0]
        metadatas = results.get("metadatas", [[]])[0]
        distances = results.get("distances", [[]])[0]
        return [
            {
                "content": doc,
                "document_id": meta.get("document_id"),
                "chunk_index": meta.get("chunk_index"),
                "score": 1.0 - dist,
            }
            for doc, meta, dist in zip(documents, metadatas, distances)
        ]

    def delete_document(self, kb_id: int, document_id: int) -> None:
        try:
            self._collection(kb_id).delete(where={"document_id": document_id})
        except Exception:
            pass

    def delete_collection(self, kb_id: int) -> None:
        try:
            self._client.delete_collection(name=f"kb_{kb_id}")
        except Exception:
            pass


vector_store = VectorStore()
