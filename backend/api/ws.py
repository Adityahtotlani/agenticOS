import asyncio
import json
from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from agents import get_agent_runtime
from agents.user_input import push_response, clear_queue

router = APIRouter(tags=["websocket"])


async def _client_reader(websocket: WebSocket, agent_id: int) -> None:
    """Consume incoming client messages and route user_response events to the queue."""
    try:
        while True:
            data = await websocket.receive_json()
            if data.get("type") == "user_response":
                await push_response(agent_id, data)
    except WebSocketDisconnect:
        pass
    except Exception:
        pass


@router.websocket("/ws/agents/{agent_id}/stream")
async def websocket_agent_stream(websocket: WebSocket, agent_id: int):
    await websocket.accept()
    reader_task: asyncio.Task | None = None
    try:
        # The first message must contain the task_id
        init = await websocket.receive_json()
        task_id = init.get("task_id")
        if not task_id:
            await websocket.send_json({"type": "error", "message": "task_id required"})
            await websocket.close()
            return

        clear_queue(agent_id)
        reader_task = asyncio.create_task(_client_reader(websocket, agent_id))

        runtime = get_agent_runtime(agent_id)
        async for chunk in runtime.run_task(task_id):
            try:
                event = json.loads(chunk)
            except json.JSONDecodeError:
                event = {"type": "output", "chunk": chunk}
            await websocket.send_json(event)

        await websocket.send_json({"type": "done"})

    except WebSocketDisconnect:
        pass
    except Exception as e:
        try:
            await websocket.send_json({"type": "error", "message": str(e)})
        except Exception:
            pass
    finally:
        if reader_task:
            reader_task.cancel()
        clear_queue(agent_id)
        try:
            await websocket.close()
        except Exception:
            pass
