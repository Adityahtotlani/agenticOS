import asyncio
from typing import Optional, AsyncGenerator
from anthropic import Anthropic
from database import SessionLocal
from models import Agent, Task, Memory
from config import settings


class AgentRuntime:
    def __init__(self, agent_id: int):
        self.agent_id = agent_id
        self.client = Anthropic(api_key=settings.anthropic_api_key)
        self.db = SessionLocal()
        self.running = False

    async def run_task(self, task_id: int) -> AsyncGenerator[str, None]:
        """Run a task and stream agent output token by token."""
        self.running = True
        try:
            agent = self.db.query(Agent).filter(Agent.id == self.agent_id).first()
            task = self.db.query(Task).filter(Task.id == task_id).first()

            if not agent or not task:
                yield "ERROR: Agent or task not found\n"
                return

            agent.status = "running"
            task.status = "running"
            self.db.commit()

            # Get message history from memory
            messages = self._get_message_history()
            messages.append({
                "role": "user",
                "content": f"Task: {task.title}\n\n{task.description}"
            })

            # Stream from Claude
            async for chunk in self._stream_claude(messages, agent.system_prompt):
                yield chunk

            agent.status = "idle"
            task.status = "done"
            self.db.commit()

        except Exception as e:
            agent.status = "dead"
            task.status = "failed"
            self.db.commit()
            yield f"\nERROR: {str(e)}\n"
        finally:
            self.running = False
            self.db.close()

    async def _stream_claude(self, messages: list, system_prompt: str) -> AsyncGenerator[str, None]:
        """Stream tokens from Claude API."""
        with self.client.messages.stream(
            model="claude-sonnet-4-6",
            max_tokens=2048,
            system=system_prompt,
            messages=messages
        ) as stream:
            full_response = ""
            for text in stream.text_stream:
                full_response += text
                yield text

            # Store message in memory
            memory = Memory(
                agent_id=self.agent_id,
                role="assistant",
                content=full_response,
                type="short_term"
            )
            self.db.add(memory)
            self.db.commit()

    def _get_message_history(self, limit: int = 10) -> list:
        """Fetch recent message history from memory."""
        memories = self.db.query(Memory).filter(
            Memory.agent_id == self.agent_id,
            Memory.type == "short_term"
        ).order_by(Memory.created_at.desc()).limit(limit).all()

        return [
            {"role": m.role, "content": m.content}
            for m in reversed(memories)
        ]

    def pause(self):
        agent = self.db.query(Agent).filter(Agent.id == self.agent_id).first()
        if agent:
            agent.status = "paused"
            self.db.commit()

    def kill(self):
        self.running = False
        agent = self.db.query(Agent).filter(Agent.id == self.agent_id).first()
        if agent:
            agent.status = "dead"
            self.db.commit()
