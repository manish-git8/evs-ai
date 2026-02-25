"""
Ticket submission route handlers.

This module handles support ticket creation and email notifications.
"""

import uuid
from fastapi import APIRouter, Request, BackgroundTasks

from models.schemas import Issue
from services.email_service import send_ticket_email
from utils.rate_limiter import limiter, RATE_LIMIT_TICKET
from utils.audit_logger import log_action, log_error

# Create router for ticket endpoints
router = APIRouter()


@router.post("/ticket")
@limiter.limit(RATE_LIMIT_TICKET)
async def ticket(request: Request, ticket_request: Issue, background_tasks: BackgroundTasks):
    """
    Submit a support ticket.
    
    Creates a unique ticket ID and sends confirmation emails
    to both the user and admin team in the background.
    
    Args:
        request: FastAPI Request object (required for rate limiting)
        ticket_request: Issue model containing name, email, text, and optional session_id
        background_tasks: FastAPI BackgroundTasks for async email sending
        
    Returns:
        Dictionary containing:
        - success: Boolean indicating ticket creation success
        - ticket_id: Unique ticket identifier
        - message: Confirmation message
        - email: User's email address
    """
    name = ticket_request.name  
    text = ticket_request.text  
    email = ticket_request.email

    # Generate unique ticket ID
    ticket_id = "TCK-" + str(uuid.uuid4())[:8].upper()

    # Send ticket confirmation emails in background (non-blocking)
    background_tasks.add_task(send_ticket_email, ticket_id, name, email, text)
    
    # Log action
    log_action("ticket_submitted", details={
        "ticket_id": ticket_id,
        "email": email
    })

    return {
        "success": True,
        "ticket_id": ticket_id,
        "message": f"Thank you {name}! Your ticket has been created successfully.",
        "email": email
    }
