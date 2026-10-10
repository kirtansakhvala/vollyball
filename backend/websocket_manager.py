import json
import logging
from typing import Dict, Set, Any
from fastapi import WebSocket

logger = logging.getLogger("uvicorn")

class WebSocketManager:
    def __init__(self):
        self.match_connections: Dict[int, Set[WebSocket]] = {}
        self.global_connections: Set[WebSocket] = set()

    async def connect_match(self, match_id: int, websocket: WebSocket):
        await websocket.accept()
        if match_id not in self.match_connections:
            self.match_connections[match_id] = set()
        self.match_connections[match_id].add(websocket)

    def disconnect_match(self, match_id: int, websocket: WebSocket):
        if match_id in self.match_connections:
            self.match_connections[match_id].discard(websocket)
            if not self.match_connections[match_id]:
                del self.match_connections[match_id]

    async def connect_global(self, websocket: WebSocket):
        await websocket.accept()
        self.global_connections.add(websocket)

    def disconnect_global(self, websocket: WebSocket):
        self.global_connections.discard(websocket)

    async def broadcast_match_update(self, match_id: int, data: Dict[str, Any]):
        message_json = json.dumps(data, default=str)
        if match_id in self.match_connections:
            dead_connections = set()
            for ws in list(self.match_connections[match_id]):
                try:
                    await ws.send_text(message_json)
                except Exception:
                    dead_connections.add(ws)
            for ws in dead_connections:
                self.disconnect_match(match_id, ws)

        if self.global_connections:
            dead_global = set()
            for ws in list(self.global_connections):
                try:
                    await ws.send_text(message_json)
                except Exception:
                    dead_global.add(ws)
            for ws in dead_global:
                self.disconnect_global(ws)

ws_manager = WebSocketManager()
