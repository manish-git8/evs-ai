"""
EVSProcure Chatbot Backend API

Main application entry point for the FastAPI backend.
This is a production-grade chatbot API with modular architecture.

Author: EVSProcure Team
Version: 2.0 (Restructured)
"""

# Fix OMP: Error #15 on Windows (NumPy + PyTorch OpenMP conflict)
import os
os.environ["KMP_DUPLICATE_LIB_OK"] = "TRUE"
os.environ["OMP_NUM_THREADS"] = "1"

import time
import uvicorn
from fastapi import FastAPI, Request, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from config.settings import settings
from routes import chat_router, auth_router, cart_router, ticket_router, session_router, inventory_router, voice_router
from utils.rate_limiter import limiter
from utils.http_client import close_http_client
from utils.websocket_manager import connect as ws_connect, disconnect as ws_disconnect
from utils.audit_logger import (
    log_request,
    log_response,
    log_action,
    generate_request_id,
    set_request_id
)

# Initialize FastAPI application
app = FastAPI(
    title="EVSProcure Chatbot API",
    description="Intelligent chatbot for EVSProcure platform with cart management and support ticket functionality",
    version="2.0.0"
)

# Add rate limiter state to app
app.state.limiter = limiter

# Audit logging middleware
@app.middleware("http")
async def audit_logging_middleware(request: Request, call_next):
    """Middleware to log all incoming requests and responses."""
    # Generate and set request ID for correlation
    request_id = generate_request_id()
    set_request_id(request_id)
    
    # Store request ID in request state for access in routes
    request.state.request_id = request_id
    
    # Get client IP
    client_ip = request.client.host if request.client else "unknown"
    
    # Log incoming request
    log_request(
        method=request.method,
        path=request.url.path,
        client_ip=client_ip,
        request_id=request_id
    )
    
    # Process request and measure time
    start_time = time.time()
    response = await call_next(request)
    duration_ms = (time.time() - start_time) * 1000

    # Log response
    log_response(
        method=request.method,
        path=request.url.path,
        status_code=response.status_code,
        duration_ms=duration_ms,
        request_id=request_id
    )
    
    # Add request ID to response headers for client correlation
    response.headers["X-Request-ID"] = request_id
    
    return response

# Add rate limit exception handler
@app.exception_handler(RateLimitExceeded)
async def rate_limit_handler(request: Request, exc: RateLimitExceeded):
    return JSONResponse(
        status_code=429,
        content={
            "success": False,
            "error": "Rate limit exceeded",
            "message": "Too many requests. Please slow down and try again later.",
            "retry_after": exc.detail
        }
    )

# Configure CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization", "X-Request-ID"],
    allow_credentials=True,
)

# Register all route handlers
app.include_router(chat_router, tags=["Chat"])
app.include_router(auth_router, tags=["Authentication"])
app.include_router(cart_router, tags=["Cart Management"])
app.include_router(ticket_router, tags=["Support Tickets"])
app.include_router(session_router, tags=["Session Management"])
app.include_router(inventory_router, tags=["Inventory"])
app.include_router(voice_router, tags=["Voice AI"])


# ─── WebSocket endpoints for real-time dashboard updates ───
@app.websocket("/ws")
async def websocket_generic(websocket: WebSocket):
    """Accept generic WebSocket connections (no user_id required)."""
    await ws_connect(websocket, "anonymous")
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        ws_disconnect(websocket, "anonymous")

@app.websocket("/ws/{user_id}")
async def websocket_endpoint(websocket: WebSocket, user_id: str):
    """Accept WebSocket connections for real-time cart update notifications."""
    await ws_connect(websocket, user_id)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        ws_disconnect(websocket, user_id)

@app.get("/", tags=["Health"])
async def root():
    """
    Health check endpoint.
    
    Returns:
        Dictionary with API status information
    """
    return {
        "message": "EVSProcure Chatbot API",
        "status": "running",
        "version": "2.0.0"
    }


@app.get("/health", tags=["Health"])
async def health_check():
    """
    Comprehensive health check endpoint.
    
    Checks:
    - API server status
    - External API connectivity (basic check)
    - Session storage status
    - HTTP client status

    Returns:
        Dictionary with health status and component checks
    """
    from utils.session_manager import user_sessions
    from utils.http_client import get_http_client
    from config.constants import AUTH_API_BASE_URL

    health_status = {
        "status": "healthy",
        "timestamp": time.time(),
        "version": "2.0.0",
        "components": {
            "api": {
                "status": "healthy",
                "message": "API server is running"
            },
            "sessions": {
                "status": "healthy",
                "count": len(user_sessions),
                "message": f"Session storage operational with {len(user_sessions)} active sessions"
            },
            "http_client": {
                "status": "healthy",
                "message": "HTTP client is available"
            }
        }
    }
    
    # Check HTTP client
    try:
        client = get_http_client()
        if client.is_closed:
            health_status["components"]["http_client"]["status"] = "unhealthy"
            health_status["components"]["http_client"]["message"] = "HTTP client is closed"
            health_status["status"] = "degraded"
    except Exception as e:
        health_status["components"]["http_client"]["status"] = "unhealthy"
        health_status["components"]["http_client"]["message"] = f"HTTP client error: {str(e)}"
        health_status["status"] = "degraded"
    
    # Optional: Check external API connectivity (non-blocking, quick check)
    try:
        client = get_http_client()
        # Just check if we can create a request (don't actually send it)
        # This is a lightweight check
        health_status["components"]["external_api"] = {
            "status": "unknown",
            "message": "External API connectivity not verified (would require actual request)"
        }
    except Exception as e:
        health_status["components"]["external_api"] = {
            "status": "unhealthy",
            "message": f"External API check failed: {str(e)}"
        }
        health_status["status"] = "degraded"
    
    # Determine overall status code
    status_code = 200
    if health_status["status"] == "degraded":
        status_code = 200  # Still return 200, but indicate degraded state
    elif health_status["status"] == "unhealthy":
        status_code = 503
    
    return health_status


# Log application startup
log_action("app_started", details={"host": settings.HOST, "port": settings.PORT})

import logging as _logging
_startup_logger = _logging.getLogger(__name__)


@app.on_event("startup")
async def check_procurement_api():
    """Check if the procurement API is reachable on startup."""
    from services.procurement import check_health, ProcurementAPIError
    try:
        await check_health()
        _startup_logger.info("[OK] Procurement API is reachable")
    except ProcurementAPIError as e:
        _startup_logger.warning(f"[WARN] Procurement API health check: {e} -- legacy fallback active")
    except Exception as e:
        _startup_logger.warning(f"[WARN] Procurement API health check failed: {e} -- legacy fallback active")


@app.on_event("shutdown")
async def shutdown_event():
    """Cleanup resources on application shutdown."""
    await close_http_client()
    log_action("app_shutdown", details={"message": "Application shutting down, resources cleaned up"})


if __name__ == "__main__":
    # Start the server
    uvicorn.run(
        app,
        host=settings.HOST,
        port=settings.PORT
    )
