"""
Routes module for the EVSProcure chatbot backend.

This module contains all API endpoint routers.
"""

from .chat import router as chat_router
from .auth import router as auth_router
from .cart import router as cart_router
from .ticket import router as ticket_router
from .session import router as session_router
from .inventory import router as inventory_router
from .voice import router as voice_router

__all__ = [
    "chat_router",
    "auth_router",
    "cart_router",
    "ticket_router",
    "session_router",
    "inventory_router",
    "voice_router",
]
