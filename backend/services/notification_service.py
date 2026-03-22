import asyncio
from typing import Dict, Set
from fastapi import WebSocket
import json
import logging

logger = logging.getLogger(__name__)

# Global connection manager
class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, WebSocket] = {}

    async def connect(self, user_id: str, websocket: WebSocket):
        await websocket.accept()
        self.active_connections[user_id] = websocket
        logger.info(f"WebSocket connected: user {user_id}")

    def disconnect(self, user_id: str):
        self.active_connections.pop(user_id, None)
        logger.info(f"WebSocket disconnected: user {user_id}")

    async def send_personal(self, user_id: str, message: dict):
        ws = self.active_connections.get(user_id)
        if ws:
            try:
                await ws.send_text(json.dumps(message))
            except Exception as e:
                logger.warning(f"Failed to send to {user_id}: {e}")
                self.disconnect(user_id)

    async def broadcast(self, message: dict, role_filter: str = None):
        disconnected = []
        for uid, ws in self.active_connections.items():
            try:
                await ws.send_text(json.dumps(message))
            except Exception:
                disconnected.append(uid)
        for uid in disconnected:
            self.disconnect(uid)

    async def notify_report_update(self, report_id: str, status: str, user_id: str):
        await self.send_personal(user_id, {
            "type": "report_update",
            "report_id": report_id,
            "status": status,
            "message": f"Your report status changed to: {status}"
        })

    async def notify_job_update(self, job_id: str, status: str, contractor_id: str = None):
        payload = {
            "type": "job_update",
            "job_id": job_id,
            "status": status,
        }
        if contractor_id:
            await self.send_personal(contractor_id, {**payload, "message": f"Job status: {status}"})
        else:
            await self.broadcast(payload)

    async def notify_bid_accepted(self, contractor_id: str, job_id: str):
        await self.send_personal(contractor_id, {
            "type": "bid_accepted",
            "job_id": job_id,
            "message": "🎉 Your bid has been accepted! Check your jobs."
        })


manager = ConnectionManager()
