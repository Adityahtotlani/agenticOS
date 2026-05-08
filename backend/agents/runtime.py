import json
from typing import AsyncGenerator
from anthropic import Anthropic
from database import SessionLocal
from models import Agent, Task, Memory
from config import settings
from tools import TOOL_SCHEMAS, execute_tool


class AgentRuntime:
    def __init__(self, agent_id: int):
        self.agent_id = agent_id
        self.client = Anthropic(api_key=settings.anthropic_api_key)
        self.running = False

    async def run_task(self, task_id: int) -> AsyncGenerator[str, None]:
        """Run a task and stream agent output token by token."""
        db = SessionLocal()
        self.running = True
        try:
            agent = db.query(Agent).filter(Agent.id == self.agent_id).first()
            task = db.query(Task).filter(Task.id == task_id).first()

            if not agent or not task:
                yield json.dumps({"type": "error", "message": "Agent or task not found"})
                return

            agent.status = "running"
            task.status = "running"
            db.commit()

            # Get long-term memory context
            long_term_context = self._get_long_term_memory(db)

            # Get recent short-term history
            messages = self._get_message_history(db)
            messages.append({
                "role": "user",
                "content": f"Task: {task.title}\n\n{task.description}"
            })

            # Build system prompt with long-term context
            system_prompt = agent.system_prompt
            if long_term_context:
                system_prompt += f"\n\nPrevious learnings:\n{long_term_context}"

            # Run multi-turn tool loop
            await self._run_tool_loop(messages, system_prompt, db)

            # Generate long-term memory summary
            await self._save_long_term_memory(messages, task, db)

            agent.status = "idle"
            task.status = "done"
            task.result = "Task completed successfully"
            db.commit()

        except Exception as e:
            agent = db.query(Agent).filter(Agent.id == self.agent_id).first()
            task = db.query(Task).filter(Task.id == task_id).first()
            if agent:
                agent.status = "dead"
            if task:
                task.status = "failed"
                task.result = str(e)
            db.commit()
            yield json.dumps({"type": "error", "message": str(e)})
        finally:
            self.running = False
            db.close()

    async def _run_tool_loop(self, messages: list, system_prompt: str, db) -> None:
        """Multi-turn loop for tool use and streaming."""
        while True:
            # Stream response from Claude with tools
            with self.client.messages.stream(
                model="claude-sonnet-4-6",
                max_tokens=2048,
                system=system_prompt,
                messages=messages,
                tools=TOOL_SCHEMAS
            ) as stream:
                # Stream text tokens as they arrive
                full_response = ""
                for text in stream.text_stream:
                    full_response += text
                    yield json.dumps({"type": "output", "chunk": text})

                # Get final message after stream ends
                response = stream.get_final_message()

            # Save assistant message to memory
            memory = Memory(
                agent_id=self.agent_id,
                role="assistant",
                content=full_response,
                type="short_term"
            )
            db.add(memory)
            db.commit()

            # Check stop reason
            if response.stop_reason == "end_turn":
                break

            if response.stop_reason == "tool_use":
                # Extract and execute tools
                tool_uses = [b for b in response.content if b.type == "tool_use"]
                tool_results = []

                for tool_use in tool_uses:
                    yield json.dumps({
                        "type": "tool_call",
                        "name": tool_use.name,
                        "input": json.dumps(tool_use.input)
                    })

                    result = await execute_tool(tool_use.name, tool_use.input)

                    yield json.dumps({
                        "type": "tool_result",
                        "name": tool_use.name,
                        "result": result[:500]  # Limit result length
                    })

                    tool_results.append({
                        "type": "tool_result",
                        "tool_use_id": tool_use.id,
                        "content": result
                    })

                # Append assistant message with tool use to conversation
                messages.append({
                    "role": "assistant",
                    "content": response.content
                })

                # Append tool results
                messages.append({
                    "role": "user",
                    "content": tool_results
                })

    async def _save_long_term_memory(self, messages: list, task: Task, db) -> None:
        """Generate and save a long-term memory summary of the task."""
        try:
            # Create a summary prompt
            summary_prompt = f"""Summarize what you learned from completing this task:

Task: {task.title}
Description: {task.description}

Provide a brief summary (2-3 sentences) of key learnings or results."""

            # Call Claude to generate summary
            response = self.client.messages.create(
                model="claude-sonnet-4-6",
                max_tokens=500,
                messages=[
                    *messages,
                    {"role": "user", "content": summary_prompt}
                ]
            )

            summary = response.content[0].text

            # Save as long-term memory
            memory = Memory(
                agent_id=self.agent_id,
                role="assistant",
                content=f"Task Summary: {summary}",
                type="long_term"
            )
            db.add(memory)
            db.commit()
        except Exception:
            pass  # Don't fail the task if summary fails

    def _get_long_term_memory(self, db, limit: int = 3) -> str:
        """Fetch and format long-term memory for context."""
        memories = db.query(Memory).filter(
            Memory.agent_id == self.agent_id,
            Memory.type == "long_term"
        ).order_by(Memory.created_at.desc()).limit(limit).all()

        if not memories:
            return ""

        return "\n".join([f"- {m.content}" for m in memories])

    def _get_message_history(self, db, limit: int = 10) -> list:
        """Fetch recent short-term message history from memory."""
        memories = db.query(Memory).filter(
            Memory.agent_id == self.agent_id,
            Memory.type == "short_term"
        ).order_by(Memory.created_at.desc()).limit(limit).all()

        return [
            {"role": m.role, "content": m.content}
            for m in reversed(memories)
        ]

    def pause(self):
        db = SessionLocal()
        try:
            agent = db.query(Agent).filter(Agent.id == self.agent_id).first()
            if agent:
                agent.status = "paused"
                db.commit()
        finally:
            db.close()

    def kill(self):
        self.running = False
        db = SessionLocal()
        try:
            agent = db.query(Agent).filter(Agent.id == self.agent_id).first()
            if agent:
                agent.status = "dead"
                db.commit()
        finally:
            db.close()
