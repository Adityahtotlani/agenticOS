# AgenticOS — Operating System for AI Agents

A web-based dashboard for spawning, monitoring, and orchestrating Claude-powered AI agents.

## Quick Start

### Prerequisites
- Python 3.10+
- Node.js 18+
- Docker (optional)

### Setup

1. Clone the repository:
```bash
git clone https://github.com/Adityahtotlani/agenticOS.git
cd agenticOS
```

2. Create `.env` file in the project root:
```bash
cp .env.example .env
# Edit .env and add your ANTHROPIC_API_KEY
```

3. Setup Backend:
```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

4. Setup Frontend:
```bash
cd frontend
npm install
```

### Running the Application

#### Terminal 1 — Backend:
```bash
cd backend
source venv/bin/activate
uvicorn main:app --reload
```

Backend will be available at `http://localhost:8000`

#### Terminal 2 — Frontend:
```bash
cd frontend
npm run dev
```

Frontend will be available at `http://localhost:3000`

## Features (Phase 1 MVP)

- ✅ Spawn and manage AI agents
- ✅ Create and assign tasks to agents
- ✅ Real-time streaming of agent output via WebSockets
- ✅ Browser-based dashboard with agent & task management
- ✅ Agent status monitoring (idle, running, paused, dead)

## Architecture

```
AgenticOS/
├── backend/              # FastAPI + SQLAlchemy + Anthropic
│   ├── agents/          # Agent runtime & lifecycle
│   ├── api/             # REST + WebSocket endpoints
│   ├── models/          # SQLAlchemy ORM models
│   └── main.py          # FastAPI app entry point
└── frontend/            # Next.js 14 + TypeScript + Tailwind
    ├── app/             # Next.js App Router pages
    ├── components/      # React components
    └── lib/             # Utilities & API client
```

## Next Steps (Phase 2+)

- [ ] Tool Registry: Web search, code execution, file operations
- [ ] Memory Management: Short-term (context) + long-term (persistent)
- [ ] Multi-agent Orchestration: Parent agents spawn children
- [ ] Docker Compose: One-command startup
- [ ] Authentication & Authorization

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## License

MIT
