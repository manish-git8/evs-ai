"""
Shared HTTP client for efficient connection pooling and reuse.

This module provides a singleton HTTP client instance that is reused
across all service requests, enabling connection pooling and reducing
overhead from creating new connections for each request.
"""

import httpx
from typing import Optional

# Global HTTP client instance (initialized on first use)
_http_client: Optional[httpx.AsyncClient] = None


def get_http_client() -> httpx.AsyncClient:
    """
    Get or create the shared HTTP client instance.
    
    The client is configured with:
    - Connection pooling (reuses connections)
    - 30 second timeout
    - Limits to prevent resource exhaustion
    
    Returns:
        Shared httpx.AsyncClient instance
    """
    global _http_client
    
    if _http_client is None:
        _http_client = httpx.AsyncClient(
            timeout=30.0,
            limits=httpx.Limits(
                max_connections=100,
                max_keepalive_connections=20
            ),
            follow_redirects=True
        )
    
    return _http_client


async def close_http_client() -> None:
    """
    Close the HTTP client and cleanup resources.
    
    Should be called during application shutdown.
    """
    global _http_client
    
    if _http_client is not None:
        await _http_client.aclose()
        _http_client = None

