"""
Configuration module for the EVSProcure chatbot backend.

This module contains application settings, environment variables,
and constant values used throughout the application.
"""

from .settings import settings
from .constants import AUTH_API_BASE_URL, ENTITY_LABELS, STATUS_COLORS

__all__ = [
    "settings",
    "AUTH_API_BASE_URL",
    "ENTITY_LABELS",
    "STATUS_COLORS",
]
