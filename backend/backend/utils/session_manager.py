"""
Session management utilities.

This module handles user session storage and retrieval for the chatbot,
maintaining conversation state and authentication tokens with automatic expiration.

Session TTL: 30 minutes (1800 seconds), refreshed on each command.
Sessions with is_listening=True or is_processing=True will NOT expire.
"""

import time
from typing import Dict

# Session expiration time: 30 minutes (1800 seconds)
SESSION_TTL_SECONDS = 1800

# In-memory user session storage
# Format: {session_id: {data: {...}, expires_at: timestamp}}
user_sessions: Dict[str, Dict] = {}


def _cleanup_expired_sessions() -> None:
    """
    Remove expired sessions from memory.
    Called automatically during session operations to prevent memory leaks.
    Sessions with is_listening=True or is_processing=True are protected from expiry.
    """
    current_time = time.time()
    expired_keys = []
    for session_id, session_data in user_sessions.items():
        # Skip sessions that are actively listening or processing
        data = session_data.get("data", {})
        if data.get("is_listening") or data.get("is_processing"):
            continue
        if session_data.get("expires_at", 0) < current_time:
            expired_keys.append(session_id)
    for key in expired_keys:
        del user_sessions[key]


def get_session(session_id: str) -> Dict:
    """
    Get or create a user session with automatic expiration.
    
    Sessions expire after 30 minutes of inactivity. Expired sessions are
    automatically cleaned up to prevent memory leaks. TTL is refreshed
    on every access (sliding window).
    
    Args:
        session_id: Unique identifier for the user session
        
    Returns:
        Dictionary containing session data with fields:
        - waiting_for_id: Boolean indicating if session is waiting for ID input
        - query_type: Type of query being processed
        - id_type: Type of ID being requested
        - token: JWT authentication token
        - entityid: Company/entity ID from token
        - is_listening: Boolean, True when voice is actively listening
        - is_processing: Boolean, True when a command is being processed
    """
    # Clean up expired sessions periodically (every 100 requests)
    if len(user_sessions) > 0 and len(user_sessions) % 100 == 0:
        _cleanup_expired_sessions()
    
    current_time = time.time()
    
    # Check if session exists and is not expired
    if session_id in user_sessions:
        session_data = user_sessions[session_id]
        data = session_data.get("data", {})
        # Sessions with is_listening or is_processing are never expired
        is_protected = data.get("is_listening") or data.get("is_processing")
        if is_protected or session_data.get("expires_at", 0) >= current_time:
            # Update expiration time on access (sliding window)
            session_data["expires_at"] = current_time + SESSION_TTL_SECONDS
            return session_data["data"]
        else:
            # Session expired, remove it
            del user_sessions[session_id]
    
    # Create new session
    new_session_data = {
        "waiting_for_id": False,
        "query_type": None,
        "id_type": None,
        "token": None,
        "entityid": None,
        "is_listening": False,
        "is_processing": False,
    }
    
    user_sessions[session_id] = {
        "data": new_session_data,
        "expires_at": current_time + SESSION_TTL_SECONDS
    }
    
    return new_session_data


def refresh_session(session_id: str, is_listening: bool = None, is_processing: bool = None) -> Dict:
    """
    Refresh session TTL and optionally update listening/processing flags.
    
    Args:
        session_id: Unique identifier for the session
        is_listening: Optional flag to update listening state
        is_processing: Optional flag to update processing state
        
    Returns:
        Dictionary with:
        - success: Boolean indicating if session was found and refreshed
        - expires_in: Seconds until session expires
    """
    current_time = time.time()
    
    if session_id not in user_sessions:
        # Create the session if it doesn't exist
        get_session(session_id)
    
    session_data = user_sessions[session_id]
    session_data["expires_at"] = current_time + SESSION_TTL_SECONDS
    
    # Update flags if provided
    if is_listening is not None:
        session_data["data"]["is_listening"] = is_listening
    if is_processing is not None:
        session_data["data"]["is_processing"] = is_processing
    
    return {
        "success": True,
        "expires_in": SESSION_TTL_SECONDS
    }


def clear_session(session_id: str) -> None:
    """
    Explicitly clear a session (logout).
    
    Args:
        session_id: Unique identifier for the session to clear
    """
    if session_id in user_sessions:
        del user_sessions[session_id]


def cleanup_all_expired() -> int:
    """
    Manually trigger cleanup of all expired sessions.
    
    Returns:
        Number of sessions cleaned up
    """
    before_count = len(user_sessions)
    _cleanup_expired_sessions()
    return before_count - len(user_sessions)
