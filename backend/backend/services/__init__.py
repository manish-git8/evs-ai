"""
Services module for the EVSProcure chatbot backend.

This module contains all business logic and external API integrations
including authentication, cart management, inventory, pattern matching, and email services.
"""

from .auth_service import authenticate_user, get_user_details
from .cart_service import (
    get_cart_details,
    create_cart,
    create_cart_with_items,
    get_pending_approval_carts,
    approve_cart,
)
from .inventory_service import check_inventory
from .pattern_service import parse_intent, search_patterns
from .email_service import send_ticket_email
from .procurement import (
    ProcurementAPIError,
    get_carts_paginated,
    get_cart_approvals_paginated,
    get_cart_by_id,
    approve_cart as procurement_approve_cart,
    reject_cart as procurement_reject_cart,
    get_pos_paginated,
    get_po_approvals_paginated,
    approve_po,
    reject_po,
    get_rfqs_paginated,
    get_rfq_approvals_paginated,
    approve_rfq,
    reject_rfq,
    check_health,
)

__all__ = [
    "authenticate_user",
    "get_user_details",
    "get_cart_details",
    "create_cart",
    "create_cart_with_items",
    "get_pending_approval_carts",
    "approve_cart",
    "check_inventory",
    "parse_intent",
    "search_patterns",
    "send_ticket_email",
    "ProcurementAPIError",
    "get_carts_paginated",
    "get_cart_approvals_paginated",
    "get_cart_by_id",
    "procurement_approve_cart",
    "procurement_reject_cart",
    "get_pos_paginated",
    "get_po_approvals_paginated",
    "approve_po",
    "reject_po",
    "get_rfqs_paginated",
    "get_rfq_approvals_paginated",
    "approve_rfq",
    "reject_rfq",
    "check_health",
]
