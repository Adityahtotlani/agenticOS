# AgenticOS Quick Start Guide

Get up and running in 5 minutes.

## Step 1: Prerequisites
- Python 3.10+
- Node.js 18+
- ANTHROPIC_API_KEY from [Anthropic Console](https://console.anthropic.com)

## Step 2: Clone & Setup
```bash
git clone https://github.com/Adityahtotlani/agenticOS.git
cd agenticOS
bash setup.sh
```

## Step 3: Configure API Key
```bash
# Edit .env and add your ANTHROPIC_API_KEY
echo "ANTHROPIC_API_KEY=sk-ant-..." >> .env
```

## Step 4: Run the Application

**Terminal 1 (Backend):**
```bash
cd backend
source venv/bin/activate
uvicorn main:app --reload
```

**Terminal 2 (Frontend):**
```bash
cd frontend
npm run dev
```

Visit **http://localhost:3000** 🎉

## Step 5: Create Your First Agent

1. Navigate to `/agents` 
2. Click "New Agent"
3. Enter a name (e.g., "Research Agent")
4. Select a model (Claude Sonnet 4.6 recommended)
5. Click "Create Agent"

## Step 6: Create a Task

1. Navigate to `/tasks`
2. Click "New Task"
3. Enter a title (e.g., "Analyze Python")
4. Enter a description (e.g., "What are the key features of Python?")
5. Optionally assign to an agent
6. Click "Create Task"

## Step 7: Run the Agent

1. Go to your agent's detail page
2. Select a task from the right panel
3. Watch the agent work in the terminal!
4. Output streams in real-time

## API Endpoints

### Agents
```
GET    /api/agents              # List all agents
POST   /api/agents              # Create agent
GET    /api/agents/{id}         # Get agent details
POST   /api/agents/{id}/pause   # Pause agent
POST   /api/agents/{id}/kill    # Kill agent
```

### Tasks
```
GET    /api/tasks               # List all tasks
POST   /api/tasks               # Create task
GET    /api/tasks/{id}          # Get task details
```

### WebSocket
```
WS     /ws/agents/{id}/stream   # Stream agent output (send {"task_id": N})
```

## Troubleshooting

**Backend fails to start:**
- Ensure Python 3.10+ is installed: `python3 --version`
- Verify ANTHROPIC_API_KEY is set in .env
- Check port 8000 is not in use: `lsof -i :8000`

**Frontend won't load:**
- Ensure Node 18+ is installed: `node --version`
- Try clearing cache: `rm -rf frontend/.next`
- Check port 3000 is not in use: `lsof -i :3000`

**WebSocket connection fails:**
- Ensure backend is running on port 8000
- Check browser console for CORS errors
- Try refreshing the page

## Next Steps

- Explore **Phase 2** features (tools, memory, multi-agent)
- Read [ARCHITECTURE.md](ARCHITECTURE.md)
- Check [CONTRIBUTING.md](CONTRIBUTING.md)

Happy agent spawning! 🤖
