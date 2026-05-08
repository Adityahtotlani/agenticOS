from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database import Base, engine
from api import agents, tasks, ws, memory
from models import Agent, Task, Memory

# Create tables
Base.metadata.create_all(bind=engine)

app = FastAPI(title="AgenticOS", description="Operating System for AI Agents")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(agents.router)
app.include_router(tasks.router)
app.include_router(memory.router)
app.include_router(ws.router)


@app.get("/health")
def health():
    return {"status": "ok"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
