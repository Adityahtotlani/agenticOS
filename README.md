# AgenticOS — Operating System for AI Agents

A web-based dashboard for spawning, monitoring, and orchestrating Claude-powered AI agents.

## Quick Start

### Prerequisites
- Python 3.10+
- Node.js 18+
- ANTHROPIC_API_KEY (get one from [Anthropic Console](https://console.anthropic.com))

### Installation

1. Clone and setup:
```bash
git clone https://github.com/Adityahtotlani/agenticOS.git
cd agenticOS
bash setup.sh
```

2. Configure environment:
```bash
# Edit .env and add your ANTHROPIC_API_KEY
nano .env
```

### Running the Application

**Option A: Manual (2 terminals)**

Terminal 1:
```bash
cd backend
source venv/bin/activate
uvicorn main:app --reload
```

Terminal 2:
```bash
cd frontend
npm run dev
```

**Option B: Docker (single command)**
```bash
ANTHROPIC_API_KEY=your_key_here docker-compose up
```

Then visit **http://localhost:3000** in your browser.

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
