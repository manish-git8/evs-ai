"""
WebSocket connection manager for real-time dashboard updates.

Manages active WebSocket connections per user and broadcasts
cart mutation events (create, approve, reject) to connected clients.
"""

import logging
from typing import Dict, List
from fastapi import WebSocket

logger = logging.getLogger(__name__)

# Active WebSocket connections: {user_id: [WebSocket, ...]}
active_connections: Dict[str, List[WebSocket]] = {}


async def connect(websocket: WebSocket, user_id: str):
    """Accept and register a WebSocket connection for a user."""
    await websocket.accept()
    if user_id not in active_connections:
        active_connections[user_id] = []
    active_connections[user_id].append(websocket)
    logger.info(f"WebSocket connected for user {user_id}. Total connections: {len(active_connections[user_id])}")


def disconnect(websocket: WebSocket, user_id: str):
    """Remove a WebSocket connection for a user."""
    if user_id in active_connections:
        if websocket in active_connections[user_id]:
            active_connections[user_id].remove(websocket)
        if not active_connections[user_id]:
            del active_connections[user_id]
    logger.info(f"WebSocket disconnected for user {user_id}")


async def broadcast_cart_update(event: dict):
    """
    Broadcast a cart mutation event to ALL connected clients.
    
    Event types: cart_created, cart_approved, cart_rejected
    
    Broadcasting to all users ensures that both the approver AND the
    cart requester (and any other logged-in users) see the real-time update.
    
    Args:
        event: Dict with at minimum 'type' and 'user_id' keys
    """
    dead_connections = []
    total_sent = 0
    
    # Broadcast to ALL connected users for real-time dashboard sync
    for uid, connections in list(active_connections.items()):
        for ws in connections:
            try:
                await ws.send_json(event)
                total_sent += 1
            except Exception:
                dead_connections.append((uid, ws))
    
    if total_sent > 0:
        logger.info(f"[WS] Broadcast {event.get('type', '?')} to {total_sent} client(s)")
    
    # Clean up dead connections
    for uid, ws in dead_connections:
        disconnect(ws, uid)
