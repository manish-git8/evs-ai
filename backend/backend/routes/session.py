"""
Session management route handlers.

This module handles session heartbeat and logout endpoints.
"""

from fastapi import APIRouter, Request

from models.schemas import HeartbeatRequest, LogoutRequest
from utils.session_manager import refresh_session, clear_session, SESSION_TTL_SECONDS
from utils.audit_logger import log_action

# Create router for session endpoints
router = APIRouter()


@router.post("/session/heartbeat")
async def session_heartbeat(request: Request, heartbeat: HeartbeatRequest):
    """
    Refresh session TTL and update listening/processing flags.
    
    Frontend should call this during idle listening to prevent session expiry.
    
    Args:
        heartbeat: HeartbeatRequest with session_id and optional flags
        
    Returns:
        Dictionary with success status and seconds until expiry
    """
    result = refresh_session(
        session_id=heartbeat.session_id,
        is_listening=heartbeat.is_listening,
        is_processing=heartbeat.is_processing
    )
    
    log_action("session_heartbeat", details={
        "session_id": heartbeat.session_id,
        "is_listening": heartbeat.is_listening,
        "is_processing": heartbeat.is_processing,
        "expires_in": result["expires_in"]
    })
    
    return {
        "success": True,
        "expires_in": result["expires_in"],
        "message": f"Session refreshed. Expires in {SESSION_TTL_SECONDS} seconds."
    }


@router.post("/logout")
async def logout(request: Request, logout_request: LogoutRequest):
    """
    Explicitly terminate a session.
    
    Args:
        logout_request: LogoutRequest with session_id
        
    Returns:
        Dictionary with success status and message
    """
    clear_session(logout_request.session_id)
    
    log_action("session_logout", details={
        "session_id": logout_request.session_id
    })
    
    return {
        "success": True,
        "message": "Session terminated successfully."
    }
