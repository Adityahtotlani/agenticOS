"""Per-agent queues for user responses to ask_user / tool approval requests."""
import asyncio
from typing import Dict, Any

_queues: Dict[int, asyncio.Queue] = {}


def get_queue(agent_id: int) -> asyncio.Queue:
    if agent_id not in _queues:
        _queues[agent_id] = asyncio.Queue()
    return _queues[agent_id]


def clear_queue(agent_id: int) -> None:
    """Drop any pending responses for an agent (e.g. when its WS disconnects)."""
    q = _queues.get(agent_id)
    if not q:
        return
    while not q.empty():
        try:
            q.get_nowait()
        except asyncio.QueueEmpty:
            break


async def push_response(agent_id: int, response: Dict[str, Any]) -> None:
    await get_queue(agent_id).put(response)


async def wait_for_response(agent_id: int, request_id: str, timeout: float = 600.0) -> Dict[str, Any]:
    """Wait for a user response matching the given request_id. Drops mismatched ones."""
    q = get_queue(agent_id)
    deadline = asyncio.get_event_loop().time() + timeout
    while True:
        remaining = deadline - asyncio.get_event_loop().time()
        if remaining <= 0:
            raise asyncio.TimeoutError(f"User response timed out after {timeout}s")
        try:
            response = await asyncio.wait_for(q.get(), timeout=remaining)
        except asyncio.TimeoutError:
            raise
        if response.get("request_id") == request_id:
            return response
