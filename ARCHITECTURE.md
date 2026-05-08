# AgenticOS Architecture

## System Overview

AgenticOS is an "operating system" for AI agents. It provides:

1. **Agent Lifecycle Management** — Spawn, run, pause, kill agents
2. **Task Orchestration** — Create tasks and assign to agents
3. **Real-time Streaming** — Watch agent output as it happens via WebSocket
4. **Persistent State** — SQLite database for agents, tasks, and memory
5. **Web Dashboard** — Browser-based UI for management

## Tech Stack

| Layer | Technology | Why |
|-------|-----------|-----|
| AI | Anthropic SDK (Claude) | Streaming, tool use, multi-turn conversations |
| Backend | FastAPI | Async, WebSocket, easy Anthropic integration |
| Database | SQLAlchemy + SQLite | ORM, migrations, type safety |
| Frontend | Next.js 14 + TypeScript | Server components, real-time UX, production ready |
| Real-time | WebSockets | Streaming agent output token-by-token |

## Directory Structure

```
agenticOS/
├── backend/
│   ├── main.py              # FastAPI entry point
│   ├── config.py            # Settings
│   ├── database.py          # SQLAlchemy setup
│   ├── agents/
│   │   ├── runtime.py       # Core: agent execution loop
│   │   ├── lifecycle.py     # Spawn / pause / kill
│   │   └── registry.py      # In-memory agent tracking
│   ├── api/
│   │   ├── agents.py        # REST: /api/agents
│   │   ├── tasks.py         # REST: /api/tasks
│   │   └── ws.py            # WebSocket streaming
│   └── models/
│       ├── agent.py         # ORM: Agent model
│       ├── task.py          # ORM: Task model
│       └── memory.py        # ORM: Memory storage
│
└── frontend/
    ├── app/                 # Next.js App Router
    │   ├── page.tsx         # Dashboard
    │   ├── agents/          # Agent pages
    │   ├── tasks/           # Task pages
    │   └── memory/          # Memory viewer
    ├── components/          # React components
    │   ├── AgentTerminal    # WebSocket-fed terminal
    │   ├── AgentCard        # Agent display
    │   ├── TaskCard         # Task display
    │   └── Sidebar          # Navigation
    └── lib/                 # Utilities
        ├── api.ts           # Fetch wrapper
        └── useAgentStream   # WebSocket hook
```

## How It Works

### 1. Agent Lifecycle

```
create_agent()
    ↓
Agent(id=1, status='idle')
    ↓
user creates task & assigns to agent
    ↓
run_task(agent_id=1, task_id=1)
    ↓
AgentRuntime.run_task() spawns Anthropic stream
    ↓
tokens → WebSocket → browser terminal
    ↓
Agent(status='running') → 'done'
```

### 2. Request Flow

**Creating a Task:**
```
Browser               Backend                Database
  ↓                     ↓                        ↓
POST /api/tasks ────→ create_task() ────→ INSERT Task
  ↓                     ↓                        ↓
  ← JSON response ← db.refresh(task)  ←────────┘
```

**Running an Agent:**
```
Browser               Backend           Anthropic       Browser
  ↓                     ↓                    ↓               ↓
WS /ws/agents/1 ────→ run_task() ────→ stream() ────→ output
  ↓                     ↓                    ↓               ↓
send task_id          AgentRuntime    Claude API        terminal
  ↓                     ↓                    ↓               ↓
  ← chunk ← ← ← token ← ← ← ← ← ← ← ← ← ← ←
  ↓                     ↓                    ↓               ↓
display               store memory    (streaming)      (real-time)
```

### 3. Data Models

**Agent**
```python
id: int
name: str
model: str (claude-sonnet-4-6, etc)
status: str (idle, running, paused, dead)
parent_id: int (nullable, for agent hierarchies)
system_prompt: str
created_at: datetime
```

**Task**
```python
id: int
title: str
description: str
status: str (pending, running, done, failed)
agent_id: int (nullable)
result: str (nullable)
created_at: datetime
```

**Memory**
```python
id: int
agent_id: int
role: str (user, assistant, tool)
content: str (message text)
type: str (short_term, long_term)
created_at: datetime
```

## Key Components

### Backend: AgentRuntime

The core execution engine. Located in `backend/agents/runtime.py`.

```python
class AgentRuntime:
    async def run_task(task_id: int):
        # 1. Fetch agent & task from DB
        # 2. Get message history from memory
        # 3. Stream from Claude API
        # 4. Yield tokens to WebSocket
        # 5. Store response in memory
        # 6. Update task status
```

**The streaming loop:**
```python
with client.messages.stream(...) as stream:
    for token in stream.text_stream:
        yield token  # sent to browser via WebSocket
```

### Frontend: AgentTerminal

The real-time terminal component. Located in `frontend/components/AgentTerminal.tsx`.

```typescript
useEffect(() => {
  const ws = new WebSocket(`ws://localhost:8000/ws/agents/${agentId}/stream`)
  
  ws.onmessage = (event) => {
    const data = JSON.parse(event.data)
    setOutput(prev => prev + data.chunk)  // append token to output
  }
})
```

## Extending AgenticOS

### Phase 2: Adding Tools

1. Create tool functions in `backend/tools/`:
   ```python
   # backend/tools/web_search.py
   async def search_web(query: str) -> str:
       # DuckDuckGo or Tavily API call
       return results
   ```

2. Register in `backend/tools/registry.py`:
   ```python
   TOOLS = {
       "web_search": {"description": "Search the web", "fn": search_web},
       "code_exec": {"description": "Execute Python", "fn": execute_code},
   }
   ```

3. Pass to Claude in `AgentRuntime`:
   ```python
   response = client.messages.create(
       ...,
       tools=[TOOLS["web_search"], TOOLS["code_exec"]],
   )
   ```

4. Handle tool calls:
   ```python
   if response.content.type == "tool_use":
       result = await TOOLS[response.tool_name](response.input)
       # send result back to Claude
   ```

### Phase 3: Multi-Agent Coordination

1. Add `parent_id` to Agent model ✅ (already done)
2. Create `orchestrator/planner.py`:
   ```python
   async def decompose_task(task: Task) -> List[Subtask]:
       # Use Claude to break task into subtasks
       # Return list of subtasks for child agents
   ```

3. Spawn child agents in `AgentRuntime`:
   ```python
   child_agent = spawn_agent(parent_id=self.agent_id)
   await child_agent.run_task(subtask_id)
   ```

## API Reference

### REST Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | /api/agents | List agents |
| POST | /api/agents | Create agent |
| GET | /api/agents/{id} | Get agent |
| POST | /api/agents/{id}/pause | Pause agent |
| POST | /api/agents/{id}/kill | Kill agent |
| GET | /api/tasks | List tasks |
| POST | /api/tasks | Create task |
| GET | /api/tasks/{id} | Get task |
| PUT | /api/tasks/{id} | Update task |

### WebSocket

**Endpoint:** `/ws/agents/{agent_id}/stream`

**Client → Server:**
```json
{"task_id": 42}
```

**Server → Client:**
```json
{"type": "output", "chunk": "Hello, "}
{"type": "output", "chunk": "world"}
{"type": "done"}
```

## Performance Notes

- **Streaming**: Tokens are yielded immediately, not buffered
- **Database**: SQLite for dev, PostgreSQL for production (swappable via `DATABASE_URL`)
- **Memory**: Short-term (in-context) + long-term (persistent) separation
- **Concurrency**: FastAPI handles multiple agents via asyncio

## Security

- CORS enabled (configure for production)
- API keys stored in `.env` (never committed)
- WebSocket validation: only authenticated agents can stream
- Database: parameterized queries (SQLAlchemy protects against SQL injection)

## Troubleshooting

**Agent doesn't output:**
- Check `agent.status` in DB (should be "running")
- Verify WebSocket connection in browser DevTools
- Check backend logs for Anthropic API errors

**Task stuck in "running":**
- Agent may have crashed; check `agent.status` 
- Kill agent with `POST /api/agents/{id}/kill`
- Check database for stale task records

**Memory grows unbounded:**
- Phase 2 will add long-term memory with cleanup
- For now, clear old memories manually via DB

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for development guidelines.
