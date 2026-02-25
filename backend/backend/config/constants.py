"""
Application-wide constants.
"""

AUTH_API_BASE_URL = "https://demo.evsprocure.com/api/ep/v1"

# Rate limits
RATE_LIMIT_CHAT = "60/minute"
RATE_LIMIT_AUTH = "10/minute"

# Entity labels
ENTITY_LABELS = {
    "cart": "Cart",
    "po": "Purchase Order",
    "rfq": "RFQ",
}

# Status colours for frontend
STATUS_COLORS = {
    "approved": "#22c55e",
    "rejected": "#ef4444",
    "pending": "#f59e0b",
    "submitted": "#3b82f6",
    "draft": "#9ca3af",
    "open": "#3b82f6",
    "closed": "#6b7280",
    "requested": "#f59e0b",
}
