"""
Pydantic models for request and response validation.

This module contains all data models used for API request validation
and response serialization in the EVSProcure chatbot backend.
"""

import re
from typing import Optional, List
from pydantic import BaseModel, field_validator


class Message(BaseModel):
    """Model for chat message requests."""
    
    text: str
    session_id: Optional[str] = None
    token: Optional[str] = None  # JWT token for authenticated requests
    source: Optional[str] = "text"  # "text" or "voice" - indicates input source


class Issue(BaseModel):
    """Model for support ticket submission."""
    
    name: str
    text: str
    email: str
    session_id: Optional[str] = None
    
    @field_validator('email')
    @classmethod
    def validate_email(cls, v: str) -> str:
        """Validate email format to ensure proper RFC 5321 compliance."""
        if not v:
            raise ValueError('Email address is required.')
        
        # Normalize email (lowercase, strip whitespace)
        v = v.lower().strip()
        
        # Basic email validation regex (RFC 5321 compliant)
        email_pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        
        if not re.match(email_pattern, v):
            raise ValueError(
                f'Invalid email address format: "{v}". '
                'Email must be in the format: user@example.com'
            )
        
        # Additional check for @ symbol (most common error)
        if '@' not in v:
            raise ValueError(
                f'Invalid email address: "{v}". '
                'Email must contain @ symbol (e.g., user@example.com)'
            )
        
        return v


class IDRequest(BaseModel):
    """Model for ID-based query requests."""
    
    id_value: str
    session_id: str
    query_type: str


class AuthRequest(BaseModel):
    """Model for authentication requests."""
    
    email: str
    password: str
    entityType: str


class ApproveCartRequest(BaseModel):
    """Model for cart approval/rejection requests (legacy endpoint)."""
    
    cartId: int
    token: str
    decision: Optional[str] = "approved"  # "approved" or "rejected"
    notes: Optional[str] = ""  # Required for rejection


class TokenValidationRequest(BaseModel):
    """Model for token validation requests."""
    
    token: str


# ═══════════════════════════════════════════════════════
# SESSION MANAGEMENT SCHEMAS
# ═══════════════════════════════════════════════════════

class HeartbeatRequest(BaseModel):
    """Model for session heartbeat requests."""
    
    session_id: str
    is_listening: Optional[bool] = False
    is_processing: Optional[bool] = False


class LogoutRequest(BaseModel):
    """Model for explicit session logout."""
    
    session_id: str


# ═══════════════════════════════════════════════════════
# INVENTORY SCHEMAS
# ═══════════════════════════════════════════════════════

class InventoryItem(BaseModel):
    """Single item for inventory check."""
    
    sku: str
    qty: int


class InventoryCheckRequest(BaseModel):
    """Model for inventory check requests."""
    
    items: List[InventoryItem]


# ═══════════════════════════════════════════════════════
# CART MANAGEMENT SCHEMAS (NEW API)
# ═══════════════════════════════════════════════════════

class CartItem(BaseModel):
    """Single item in a cart creation request."""
    
    sku: str
    qty: int
    unit_price: float


class CartCreateRequest(BaseModel):
    """Model for creating a cart with items."""
    
    user_id: str
    items: List[CartItem]
    total: float
    token: Optional[str] = None  # JWT token for authenticated requests


class CartApproveRequest(BaseModel):
    """Model for cart approval via new API."""
    
    cart_id: str
    approver_id: str
    token: Optional[str] = None


class CartRejectRequest(BaseModel):
    """Model for cart rejection via new API."""
    
    cart_id: str
    rejecter_id: str
    reason: Optional[str] = ""
    token: Optional[str] = None
