"""
Audit logging utilities.

This module provides helper functions for logging API requests,
responses, actions, and errors in a structured format.
"""

import uuid
from typing import Any, Optional
from contextvars import ContextVar

from config.logging_config import logger


# Context variable to store request ID for correlation
request_id_var: ContextVar[str] = ContextVar("request_id", default="")


def generate_request_id() -> str:
    """Generate a unique request ID for correlation."""
    return str(uuid.uuid4())[:8]


def get_request_id() -> str:
    """Get the current request ID from context."""
    return request_id_var.get()


def set_request_id(request_id: str) -> None:
    """Set the request ID in context."""
    request_id_var.set(request_id)


def log_request(
    method: str,
    path: str,
    client_ip: str,
    request_id: Optional[str] = None
) -> None:
    """
    Log an incoming API request.
    
    Args:
        method: HTTP method (GET, POST, etc.)
        path: Request path
        client_ip: Client IP address
        request_id: Optional request ID for correlation
    """
    rid = request_id or get_request_id()
    logger.info(
        f"Incoming request: {method} {path}",
        extra={
            "type": "request",
            "method": method,
            "path": path,
            "client_ip": client_ip,
            "request_id": rid
        }
    )


def log_response(
    method: str,
    path: str,
    status_code: int,
    duration_ms: float,
    request_id: Optional[str] = None
) -> None:
    """
    Log an API response.
    
    Args:
        method: HTTP method
        path: Request path
        status_code: HTTP status code
        duration_ms: Request duration in milliseconds
        request_id: Optional request ID for correlation
    """
    rid = request_id or get_request_id()
    log_level = logger.warning if status_code >= 400 else logger.info
    log_level(
        f"Response: {method} {path} -> {status_code} ({duration_ms:.2f}ms)",
        extra={
            "type": "response",
            "method": method,
            "path": path,
            "status_code": status_code,
            "duration_ms": round(duration_ms, 2),
            "request_id": rid
        }
    )


def log_action(
    action: str,
    details: Optional[dict] = None,
    user_id: Optional[str] = None,
    request_id: Optional[str] = None
) -> None:
    """
    Log a business action (e.g., cart created, ticket submitted).
    
    Args:
        action: Action name (e.g., "cart_created", "ticket_submitted")
        details: Optional dictionary with action details
        user_id: Optional user ID who performed the action
        request_id: Optional request ID for correlation
    """
    rid = request_id or get_request_id()
    extra = {
        "type": "action",
        "action": action,
        "request_id": rid
    }
    if details:
        extra["details"] = details
    if user_id:
        extra["user_id"] = user_id
        
    logger.info(f"Action: {action}", extra=extra)


def log_error(
    error: str,
    details: Optional[Any] = None,
    exc_info: bool = False,
    request_id: Optional[str] = None
) -> None:
    """
    Log an error with context.
    
    Args:
        error: Error message
        details: Optional error details
        exc_info: Whether to include exception traceback
        request_id: Optional request ID for correlation
    """
    rid = request_id or get_request_id()
    extra = {
        "type": "error",
        "request_id": rid
    }
    if details:
        extra["details"] = str(details) if not isinstance(details, (str, dict)) else details
        
    logger.error(f"Error: {error}", extra=extra, exc_info=exc_info)


def log_warning(
    message: str,
    details: Optional[Any] = None,
    request_id: Optional[str] = None
) -> None:
    """
    Log a warning.
    
    Args:
        message: Warning message
        details: Optional warning details
        request_id: Optional request ID for correlation
    """
    rid = request_id or get_request_id()
    extra = {
        "type": "warning",
        "request_id": rid
    }
    if details:
        extra["details"] = str(details) if not isinstance(details, (str, dict)) else details
        
    logger.warning(message, extra=extra)


def log_debug(
    message: str,
    details: Optional[Any] = None,
    request_id: Optional[str] = None
) -> None:
    """
    Log a debug message.
    
    Args:
        message: Debug message
        details: Optional details
        request_id: Optional request ID for correlation
    """
    rid = request_id or get_request_id()
    extra = {
        "type": "debug",
        "request_id": rid
    }
    if details:
        extra["details"] = str(details) if not isinstance(details, (str, dict)) else details
        
    logger.debug(message, extra=extra)
