"""
WebSocket API: /ws/{user_id}
Real-time notifications for citizens, contractors, and authorities.
"""
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from services.notification_service import manager

router = APIRouter(tags=["WebSocket"])


@router.websocket("/ws/{user_id}")
async def websocket_endpoint(websocket: WebSocket, user_id: str):
    """Connect user to real-time notification stream."""
    await manager.connect(user_id, websocket)
    try:
        # Send welcome message
        await manager.send_personal(user_id, {
            "type": "connected",
            "message": f"Connected to Sadak Kadak live updates!",
            "user_id": user_id,
        })
        while True:
            # Keep connection alive; wait for client messages
            data = await websocket.receive_text()
            # Echo ping/pong
            if data == "ping":
                await manager.send_personal(user_id, {"type": "pong"})
    except WebSocketDisconnect:
        manager.disconnect(user_id)
