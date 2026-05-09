from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from config import settings
from database import Base, engine, apply_lightweight_migrations
from api import agents, tasks, ws, memory, templates, knowledge_bases, mcp_servers
from models import Agent, Task, Memory, KnowledgeBase, Document, MCPServer

# Create tables and apply additive column migrations for upgraded DBs
Base.metadata.create_all(bind=engine)
apply_lightweight_migrations()

app = FastAPI(title="AgenticOS", description="Operating System for AI Agents")

# CORS
allowed_origins = [origin.strip() for origin in settings.allowed_origins.split(",")]
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(agents.router)
app.include_router(tasks.router)
app.include_router(memory.router)
app.include_router(templates.router)
app.include_router(knowledge_bases.router)
app.include_router(mcp_servers.router)
app.include_router(ws.router)


@app.get("/health")
def health():
    return {"status": "ok"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
