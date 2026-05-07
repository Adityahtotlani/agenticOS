from fastapi import APIRouter, WebSocket, WebSocketDisconnect, HTTPException
from agents import get_agent_runtime
import asyncio

router = APIRouter(tags=["websocket"])


@router.websocket("/ws/agents/{agent_id}/stream")
async def websocket_agent_stream(websocket: WebSocket, agent_id: int):
    await websocket.accept()
    try:
        while True:
            # Receive task from client
            data = await websocket.receive_json()
            task_id = data.get("task_id")

            if not task_id:
                await websocket.send_json({"error": "task_id required"})
                continue

            # Get or create agent runtime
            runtime = get_agent_runtime(agent_id)

            # Stream output
            async for chunk in runtime.run_task(task_id):
                await websocket.send_json({
                    "type": "output",
                    "chunk": chunk
                })

            await websocket.send_json({"type": "done"})

    except WebSocketDisconnect:
        pass
    except Exception as e:
        await websocket.send_json({"type": "error", "message": str(e)})
        await websocket.close()
