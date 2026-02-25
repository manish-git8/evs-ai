"""
Rate limiting utility for API protection.

This module provides rate limiting functionality using slowapi
to protect API endpoints from abuse.
"""

from slowapi import Limiter
from slowapi.util import get_remote_address

from config.settings import settings


# Create limiter with IP-based client identification
limiter = Limiter(key_func=get_remote_address)


# Rate limit strings for different endpoint types
RATE_LIMIT_CHAT = settings.RATE_LIMIT_CHAT
RATE_LIMIT_CART = settings.RATE_LIMIT_CART
RATE_LIMIT_TICKET = settings.RATE_LIMIT_TICKET
