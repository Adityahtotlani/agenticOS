import json
from rag import vector_store


async def search_kb(query: str, k: int = 5, kb_id: int = None) -> str:
    """Search the agent's attached knowledge base for relevant chunks."""
    if kb_id is None:
        return json.dumps({"error": "No knowledge base attached to this agent"})

    results = vector_store.search(kb_id, query, k=k)
    if not results:
        return json.dumps({"results": [], "message": "No matching content found"})

    return json.dumps({
        "results": [
            {
                "content": r["content"],
                "document_id": r["document_id"],
                "score": round(r["score"], 3),
            }
            for r in results
        ]
    })


SEARCH_KB_SCHEMA = {
    "name": "search_kb",
    "description": "Search the attached knowledge base for relevant information. Use this when the user asks questions that may be answered by uploaded documents.",
    "input_schema": {
        "type": "object",
        "properties": {
            "query": {
                "type": "string",
                "description": "Natural language search query",
            },
            "k": {
                "type": "integer",
                "description": "Number of chunks to retrieve (default: 5)",
                "default": 5,
            },
        },
        "required": ["query"],
    },
}
