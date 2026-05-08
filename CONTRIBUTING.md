# Contributing to AgenticOS

We welcome contributions! This guide will help you get started.

## Development Setup

1. Fork and clone the repository
2. Follow [QUICKSTART.md](QUICKSTART.md)
3. Create a feature branch: `git checkout -b feature/your-feature`

## Code Style

### Python (Backend)

- Follow PEP 8
- Use type hints for functions
- Keep functions focused and small

```python
async def fetch_agent(agent_id: int) -> Agent:
    """Fetch an agent by ID from the database."""
    db = SessionLocal()
    try:
        return db.query(Agent).filter(Agent.id == agent_id).first()
    finally:
        db.close()
```

### TypeScript (Frontend)

- Use ESLint (configured)
- Prefer functional components with hooks
- Use TypeScript for type safety

```typescript
interface AgentCardProps {
  agent: Agent
  onSelect?: (agentId: number) => void
}

export default function AgentCard({ agent, onSelect }: AgentCardProps) {
  return <div>...</div>
}
```

## Making Changes

### Adding a Feature

1. **Plan**: Open an issue describing the feature
2. **Implement**: Create a branch and implement
3. **Test**: Verify it works end-to-end
4. **Document**: Update ARCHITECTURE.md if needed
5. **Submit**: Create a pull request

### Bug Fixes

1. Create a branch: `git checkout -b fix/bug-name`
2. Add a test if possible
3. Fix the bug
4. Verify the fix works
5. Submit a PR

## Testing

### Backend

```bash
cd backend
python -m pytest tests/
```

### Frontend

```bash
cd frontend
npm run test
```

## Git Workflow

1. Make your changes
2. Commit with a clear message:
   ```
   git commit -m "feat: add tool registry for Phase 2
   
   - Create tool registry in backend/tools/registry.py
   - Add web search and code execution tools
   - Wire tools into AgentRuntime for tool use support
   ```
3. Push to your fork
4. Create a pull request with a description

## PR Checklist

- [ ] Code follows style guide
- [ ] Changes are documented
- [ ] No console errors/warnings
- [ ] Backend tests pass
- [ ] Frontend builds without errors
- [ ] Works end-to-end

## Project Phases

**Phase 1 (Current):** MVP
- ✅ Agent spawning & execution
- ✅ Real-time streaming
- ✅ Web dashboard

**Phase 2:** Tools & Memory
- Tool registry (web search, code exec, file ops)
- Long-term memory with search
- Memory viewer UI

**Phase 3:** Orchestration
- Task decomposition (multi-agent)
- Parent-child agent hierarchies
- Task tree UI

**Phase 4:** Polish
- Docker Compose setup
- Authentication
- Agent templates

## Areas We Need Help With

- [ ] Unit tests for backend modules
- [ ] E2E tests for frontend workflows
- [ ] Docker optimization
- [ ] Monitoring & observability
- [ ] Documentation improvements
- [ ] UI/UX refinements

## Questions?

- Check [ARCHITECTURE.md](ARCHITECTURE.md) for system design
- Review [QUICKSTART.md](QUICKSTART.md) for setup help
- Open an issue for questions or discussion

## License

All contributions are under the MIT License.

Happy coding! 🚀
