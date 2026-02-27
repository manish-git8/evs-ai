"""
Chat route — Complete overhaul.

Menu-driven chatbot with structured responses:
  menu     → main menu buttons
  submenu  → sub-options (Approve / Reject / Status)
  list     → paginated items + search + page numbers
  confirm  → yes/no confirmation prompt
  success  → action success
  error    → action failure
  text     → plain text

Session state tracks current menu context so the user can
navigate, paginate, search, and confirm actions conversationally.
"""

import asyncio
import logging
from fastapi import APIRouter, Request

from models.schemas import Message
from services.pattern_service import parse_intent
from services.llm_intent_service import parse_intent_llm
from services.procurement import (
    ProcurementAPIError,
    # Cart
    get_carts_paginated,
    get_cart_approvals_paginated,
    get_cart_by_id,
    get_cart_detail,
    get_catalog_items,
    approve_cart,
    reject_cart,
    # PO
    get_pos_paginated,
    get_po_approvals_paginated,
    get_po_item_details,
    get_pos_by_status,
    approve_po,
    reject_po,
    # RFQ
    get_rfqs_paginated,
    get_rfq_approvals_paginated,
    get_rfqs_by_status,
    get_rfq_by_id,
    approve_rfq,
    reject_rfq,
    # Budget
    get_budget_dashboard,
)
from jwt_utils import (
    get_company_id_from_token,
    get_user_id_from_token,
    get_user_first_name_from_token,
)
from utils.websocket_manager import broadcast_cart_update

logger = logging.getLogger(__name__)
router = APIRouter()

# ─── In-memory session store (keyed by session_id) ───
_sessions: dict = {}

# ─── Catalog cache for faster cart enrichment ───
_catalog_cache: dict = {"data": None, "ts": 0}
_CATALOG_CACHE_TTL = 300  # 5 minutes

def _get_session(sid: str) -> dict:
    if sid not in _sessions:
        _sessions[sid] = {
            "menu": None,        # current entity context: cart / po / rfq
            "submenu": None,     # current action context: approve / reject / status
            "page": 1,           # current page for lists
            "search": "",        # current search query
            "confirm_action": None,   # pending confirmation action
            "confirm_data": None,     # data for pending action
            "pending_reject": None,   # waiting for rejection reason (dict with entity info)
            "last_items": [],         # last list items for ordinal resolution
        }
    return _sessions[sid]


# ═══════════════════════════════════════════════════════════
# Response builders
# ═══════════════════════════════════════════════════════════

def _menu_response():
    """Main menu with entity choices."""
    return {
        "success": True,
        "type": "menu",
        "response": "What would you like to manage?",
        "menu_items": [
            {"id": "cart", "label": "🛒 Cart", "description": "Manage procurement carts"},
            {"id": "po", "label": "📦 PO", "description": "Manage purchase orders"},
            {"id": "rfq", "label": "📝 RFQ", "description": "Manage request for quotes"},
            {"id": "ticket", "label": "🎫 Raise Ticket", "description": "Raise a support query"},
        ],
    }


def _submenu_response(entity: str):
    """Submenu with action choices for an entity."""
    labels = {"cart": "Cart", "po": "Purchase Order", "rfq": "RFQ"}
    label = labels.get(entity, entity.upper())
    return {
        "success": True,
        "type": "submenu",
        "response": f"Select an action for **{label}**:",
        "entity": entity,
        "menu_items": [
            {"id": "approve", "label": "✅ Approve", "description": f"Approve pending {label}s"},
            {"id": "reject", "label": "❌ Reject", "description": f"Reject pending {label}s"},
            {"id": "status", "label": "📊 Status", "description": f"View {label} status"},
        ],
    }


# ── Status filter options per entity ──
# Cart API uses UPPERCASE status values (cartStatusType field)
# PO  API uses UPPERCASE with underscores (orderStatus field)
# RFQ API uses lowercase with underscores (rfqStatus field)
_STATUS_FILTERS = {
    "cart": [
        ("PENDING_APPROVAL",  "Pending Approval"),
        ("REJECTED",          "Rejected"),
        ("SUBMITTED",         "Submitted"),
        ("DRAFT",             "Draft"),
        ("POGENERATED",       "PO Generated"),
    ],
    "po": [
        ("SUBMITTED",             "Submitted"),
        ("PENDING_APPROVAL",      "Pending Approval"),
        ("PARTIALLY_CONFIRMED",    "Partially Confirmed"),
        ("CONFIRMED",             "Confirmed"),
    ],
    "rfq": [
        ("CLOSED",                "Closed"),
        ("DRAFT",                 "Draft"),
        ("SUBMITTED",             "Submitted"),
        ("SUPPLIER_SHORTLISTED",  "Supplier Shortlisted"),
    ],
}


def _status_filter_response(entity: str):
    """Status filter submenu — shows predefined status options for an entity."""
    labels = {"cart": "Cart", "po": "Purchase Order", "rfq": "RFQ"}
    label = labels.get(entity, entity.upper())
    filters = _STATUS_FILTERS.get(entity, [])
    menu_items = [
        {
            "id": f"status_filter:{entity}:{sid}",
            "label": slabel,
            "description": f"View {label}s with {slabel.split(' ', 1)[-1]} status",
        }
        for sid, slabel in filters
    ]
    return {
        "success": True,
        "type": "submenu",
        "response": f"Select a status to view **{label}s**:",
        "entity": entity,
        "menu_items": menu_items,
    }


# Navigation suggestions shown after every response
_NAV_SUGGESTIONS = ["Back to last menu", "Main menu"]


def _list_response(title: str, items: list, pagination: dict, entity: str, submenu: str, search: str = ""):
    """List response — no pagination, just recent items."""
    return {
        "success": True,
        "type": "list",
        "response": title,
        "entity": entity,
        "submenu": submenu,
        "items": items,
        "pagination": {
            "currentPage": 1,
            "totalPages": 1,
            "totalItems": len(items),
        },
        "search": search,
        "show_search": True,
        "suggestions": _NAV_SUGGESTIONS,
    }


def _confirm_response(message: str, action_data: dict):
    """Confirmation prompt."""
    return {
        "success": True,
        "type": "confirm",
        "response": message,
        "confirm_data": action_data,
    }


def _success_response(message: str, suggestions: list = None):
    """Success message with optional next-step suggestions."""
    resp = {"success": True, "type": "success", "response": message}
    resp["suggestions"] = (suggestions or []) + _NAV_SUGGESTIONS
    return resp


def _error_response(message: str):
    return {"success": True, "type": "error", "response": message, "suggestions": _NAV_SUGGESTIONS}


def _text_response(message: str):
    return {"success": True, "type": "text", "response": message, "suggestions": _NAV_SUGGESTIONS}


def _reject_reason_response(message: str, reject_data: dict):
    """Prompt for rejection reason with structured data for the frontend form."""
    return {
        "success": True,
        "type": "reject_reason",
        "response": message,
        "reject_data": reject_data,
    }


def _ticket_form_response():
    """Return a ticket form prompt."""
    return {
        "success": True,
        "type": "ticket_form",
        "response": "📝 **Raise a Support Ticket**\nPlease fill in the details below:",
    }


def _detail_response(header: dict, line_items: list, entity: str):
    """Drill-down detail view for a single item."""
    return {
        "success": True,
        "type": "detail",
        "response": f"Details for **{header.get('title', '')}**",
        "entity": entity,
        "detail": {
            "header": header,
            "items": line_items,
        },
        "suggestions": ["Back to list", "Back to menu"],
    }


# ═══════════════════════════════════════════════════════════
# Item formatters — convert raw API items to display cards
# ═══════════════════════════════════════════════════════════

def _safe_str(val) -> str:
    """Safely convert API values to strings.
    Handles nested objects like {userId, firstName, lastName, email}
    that the API returns for fields like createdBy, supplier, etc."""
    if val is None:
        return ""
    if isinstance(val, str):
        return val
    if isinstance(val, dict):
        # Try common name fields
        name_parts = []
        for key in ("firstName", "first_name"):
            if val.get(key):
                name_parts.append(str(val[key]))
        for key in ("lastName", "last_name"):
            if val.get(key):
                name_parts.append(str(val[key]))
        if name_parts:
            return " ".join(name_parts)
        # Fallback to name, title, email, or any string value
        for key in ("name", "supplierName", "title", "email", "companyName"):
            if val.get(key):
                return str(val[key])
        # Last resort: first string value
        for v in val.values():
            if isinstance(v, str) and v:
                return v
        return str(val)
    if isinstance(val, (list, tuple)):
        return ", ".join(_safe_str(v) for v in val)
    return str(val)


def _format_cart_item(item: dict) -> dict:
    """Format a cart for display — enriched card."""
    # Count line items if nested data available
    details = item.get("cartDetails") or item.get("items") or item.get("lineItems") or []
    item_count = len(details) if isinstance(details, list) else (item.get("itemCount") or item.get("noOfItems") or "")
    # Extract cart ID from multiple possible field names
    cart_id = str(item.get("cartId") or item.get("cartNo") or item.get("cartNumber") or item.get("cart_id") or item.get("id") or "")
    cart_title = _safe_str(
        item.get("cartNo") or item.get("cartName") or item.get("cartNumber") or
        item.get("cart_no") or item.get("cart_number") or
        (f"Cart #{cart_id}" if cart_id else "Cart")
    )
    return {
        "id": cart_id,
        "title": cart_title,
        "status": _safe_str(item.get("cartStatusType") or item.get("status") or item.get("cartStatus") or "unknown"),
        "date": _safe_str(item.get("createdDate") or item.get("updatedDate") or ""),
        "total": item.get("totalAmount") or item.get("total") or "",
        "created_by": _safe_str(item.get("createdByName") or item.get("createdBy") or ""),
        "needed_by": _safe_str(item.get("neededByDate") or item.get("requiredDate") or item.get("deliveryDate") or ""),
        "supplier": _safe_str(item.get("supplierName") or item.get("supplier") or ""),
        "item_count": item_count if item_count else "",
        "last_updated": _safe_str(item.get("updatedDate") or item.get("lastModifiedDate") or ""),
        "entity": "cart",
    }


def _format_po_item(item: dict) -> dict:
    """Format a PO for display."""
    # Extract PO ID from multiple possible field names
    po_id = str(
        item.get("purchaseOrderId") or item.get("poId") or item.get("po_id") or
        item.get("id") or item.get("orderId") or item.get("order_id") or ""
    )
    po_title = _safe_str(
        item.get("purchaseOrderNo") or item.get("poNo") or item.get("poNumber") or
        item.get("po_number") or item.get("purchaseOrderNumber") or item.get("orderNo") or
        item.get("order_number") or item.get("orderNumber") or
        (f"PO #{po_id}" if po_id else "PO")
    )
    return {
        "id": po_id,
        "title": po_title,
        "status": _safe_str(item.get("orderStatus") or item.get("status") or item.get("poStatus") or "unknown"),
        "date": _safe_str(item.get("orderPlacedDate") or item.get("createdDate") or item.get("orderDate") or ""),
        "total": item.get("totalAmount") or item.get("orderValue") or item.get("total") or "",
        "supplier": _safe_str(item.get("supplierName") or item.get("supplier") or item.get("vendorName") or ""),
        "entity": "po",
    }


def _format_rfq_item(item: dict) -> dict:
    """Format an RFQ for display."""
    rfq_id = str(item.get("rfqId") or item.get("id") or "")
    # Use rfqNumber for the display title (matches dashboard), fall back to rfqDisplayId
    rfq_number = item.get("rfqNumber") or item.get("rfqDisplayId") or (f"RFQ-{rfq_id}" if rfq_id else "RFQ")
    # Normalize API status values for display (API uses 'created' for Draft)
    _RFQ_STATUS_DISPLAY = {"created": "Draft"}
    raw_status = _safe_str(item.get("rfqStatus") or item.get("status") or item.get("signoffStatus") or "unknown")
    display_status = _RFQ_STATUS_DISPLAY.get(raw_status.lower(), raw_status)
    return {
        "id": rfq_id,
        "title": rfq_number,
        "status": display_status,
        "date": _safe_str(item.get("createdDate") or item.get("updatedDate") or ""),
        "suppliers_count": item.get("supplierCount") or "",
        "created_by": _safe_str(item.get("createdByName") or item.get("createdBy") or ""),
        "signoff_id": str(item.get("signoffId") or item.get("rfqSignoffId") or ""),
        "entity": "rfq",
    }


FORMATTERS = {
    "cart": _format_cart_item,
    "po": _format_po_item,
    "rfq": _format_rfq_item,
}


# ═══════════════════════════════════════════════════════════
# Detail builder — drill-down view for a single item
# ═══════════════════════════════════════════════════════════

async def _build_cart_detail(cart_id: str, token: str, company_id: int):
    """Fetch full cart detail and return a structured detail response."""
    # Fetch cart header
    cart_data = await get_cart_by_id(token, company_id, cart_id)
    header = _format_cart_item(cart_data)

    # Fetch line items
    raw_items = await get_cart_detail(token, company_id, cart_id)
    line_items = []
    for li in raw_items:
        line_items.append({
            "part_id": _safe_str(li.get("partId") or li.get("itemId") or li.get("productId") or ""),
            "description": _safe_str(li.get("description") or li.get("itemName") or li.get("productName") or li.get("name") or ""),
            "quantity": li.get("quantity") or li.get("qty") or 0,
            "unit_price": li.get("unitPrice") or li.get("price") or 0,
            "extended_price": li.get("totalPrice") or li.get("extendedPrice") or li.get("amount") or 0,
            "uom": _safe_str(li.get("uom") or li.get("unitOfMeasure") or ""),
            "supplier": _safe_str(li.get("supplierName") or li.get("supplier") or ""),
        })

    return _detail_response(header, line_items, "cart")

# ═══════════════════════════════════════════════════════════
# Single-item detail fetcher — search by ID across entity types
# ═══════════════════════════════════════════════════════════

async def _try_fetch_detail(entity: str, target_id: str, token: str, company_id: int):
    """Try to fetch a single item by searching. Returns a response dict or None.
    Enriches cart items with line items using catalog lookup for full detail display."""
    icons = {"cart": "🛒", "po": "📦", "rfq": "📝"}
    labels = {"cart": "Cart", "po": "PO", "rfq": "RFQ"}
    icon = icons.get(entity, "📋")
    label = labels.get(entity, entity.upper())

    try:
        if entity == "cart":
            data = await get_carts_paginated(token, company_id, page=1, search=target_id)
            formatter = _format_cart_item
        elif entity == "po":
            data = await get_pos_paginated(token, company_id, page=1, search=target_id)
            formatter = _format_po_item
        elif entity == "rfq":
            data = await get_rfqs_paginated(token, company_id, page=1, search=target_id)
            formatter = _format_rfq_item
        else:
            return None

        items = data.get("items", [])
        if items:
            formatted = [formatter(items[0])]
            return _list_response(
                f"{icon} {label} **{target_id}** Details",
                formatted, {"currentPage": 1, "totalPages": 1, "totalItems": 1},
                entity, "status", target_id
            )
        return None
    except Exception:
        return None


# ═══════════════════════════════════════════════════════════
# Data fetchers — paginated list retrieval per entity+submenu
# ═══════════════════════════════════════════════════════════

async def _fetch_list(entity: str, submenu: str, token: str, company_id: int, user_id: str, page: int, search: str, status_filter: str = ""):
    """Fetch the right paginated data based on entity + submenu + optional status filter.

    Routing strategy:
      - approve/reject submenus → approvals API (pending items in user's queue)
      - ALL status filters (REJECTED, APPROVED, PENDING_APPROVAL, SUBMITTED, DRAFT, etc.)
        → general list API with client-side post-filtering by cartStatusType/orderStatus/rfqStatus
        This ensures only items with the exact matching status are returned.
    """
    if entity == "cart":
        if submenu in ("approve", "reject"):
            # Approval queue — items pending this user's approval decision
            return await get_cart_approvals_paginated(token, company_id, str(user_id), page=page, search=search)
        else:
            # ALL status filters — general list with client-side cartStatusType filter
            return await get_carts_paginated(token, company_id, page=page, search=search, status=status_filter)
    elif entity == "po":
        if submenu in ("approve", "reject"):
            return await get_po_approvals_paginated(token, company_id, str(user_id), page=page, search=search)
        elif status_filter:
            # ALL PO status filters — use byStatus endpoint (same as dashboard)
            return await get_pos_paginated(token, company_id, page=page, search=search, status=status_filter, user_id=str(user_id))
        else:
            return await get_pos_paginated(token, company_id, page=page, search=search, user_id=str(user_id))
    elif entity == "rfq":
        if submenu in ("approve", "reject"):
            return await get_rfq_approvals_paginated(token, company_id, str(user_id), page=page, search=search)
        elif status_filter:
            # Status view — general /rfqs with client-side rfqStatus filter
            return await get_rfqs_by_status(
                token, company_id, str(user_id),
                signoff_status=status_filter, page=page, search=search
            )
        else:
            return await get_rfqs_paginated(token, company_id, page=page, search=search)


async def _build_list_response(entity, submenu, token, company_id, user_id, page, search, session=None, status_filter=""):
    """Fetch data, format items, and return a list response."""
    icons = {"cart": "🛒", "po": "📦", "rfq": "📋"}
    icon = icons.get(entity, "📋")
    entity_name = {"cart": "Carts", "po": "Purchase Orders", "rfq": "RFQs"}.get(entity, entity.upper() + "s")
    entity_name_lower = entity_name.lower()

    # Human-readable status label lookup
    _STATUS_DISPLAY = {
        # Cart statuses (cartStatusType — UPPERCASE, no underscores for some)
        "APPROVED": "Approved", "REJECTED": "Rejected",
        "PENDING_APPROVAL": "Pending Approval", "SUBMITTED": "Submitted",
        "DRAFT": "Draft", "POGENERATED": "PO Generated",
        # PO statuses (orderStatus — UPPERCASE with underscores)
        "CONFIRMED": "Confirmed", "PARTIALLY_APPROVED": "Partially Approved",
        "PARTIALLY_CONFIRMED": "Partially Confirmed",
        # RFQ statuses via approvals endpoint (UPPERCASE signoffStatus)
        "CLOSED": "Closed",
        "SUPPLIER_SHORTLISTED": "Supplier Shortlisted",
        # Lowercase fallbacks (from general /rfqs endpoint rfqStatus field)
        "submitted": "Submitted",
        "supplier_shortlisted": "Supplier Shortlisted",
        "closed": "Closed", "draft": "Draft",
        "created": "Created", "completed": "Completed", "cancelled": "Cancelled",
    }

    data = await _fetch_list(entity, submenu, token, company_id, user_id, page, search, status_filter=status_filter)
    formatter = FORMATTERS.get(entity, lambda x: x)
    items = [formatter(i) for i in data.get("items", [])]

    # ── Limit status lists to 5 recent items ──
    if submenu == "status" and not search:
        items = items[:5]

    item_count = len(items)

    # Build a friendly title with count
    if status_filter and not search:
        status_label = _STATUS_DISPLAY.get(status_filter, status_filter.replace("_", " ").title())
        # Status emoji mapping
        _STATUS_ICON = {
            "Approved": "✅", "Rejected": "❌", "Pending Approval": "⏳",
            "Submitted": "📤", "Draft": "📝", "PO Generated": "🔄",
            "Confirmed": "✅", "Partially Approved": "⚡", "Partially Confirmed": "⚡",
            "Closed": "🔒", "Supplier Shortlisted": "🏆",
        }
        status_icon = _STATUS_ICON.get(status_label, icon)
        if item_count > 0:
            title = f"{status_icon} {status_label} {entity_name} ({item_count})"
        else:
            title = f"{status_icon} {status_label} {entity_name}"
    elif not search:
        action_label = {
            "approve": "pending approval",
            "reject": "pending rejection",
            "status": "",
        }.get(submenu, "")
        if action_label:
            title = f"Your recent {entity_name_lower} {action_label}:"
        else:
            title = f"Your recent {entity_name_lower}:"
    else:
        title = f"{icon} Search results for \"{search}\":"

    if not items and page == 1 and not search:
        if status_filter:
            status_label = _STATUS_DISPLAY.get(status_filter, status_filter.replace("_", " ").title())
            return _text_response(f"No {status_label.lower()} {entity_name_lower} found. Try another status filter.")
        suffix = {
            "approve": "for approval",
            "reject": "for rejection",
            "status": "found",
        }.get(submenu, "records found")
        return _text_response(f"No {entity.upper()} {suffix}.")
    if not items and search:
        return _text_response(f"No results found for \"{search}\". Try a different search term.")

    # Store raw items in session for ordinal resolution ("the first one")
    if session is not None:
        session["last_items"] = data.get("items", [])

    return _list_response(title, items, data, entity, submenu, search)


# ═══════════════════════════════════════════════════════════
# Action handlers — approve / reject
# ═══════════════════════════════════════════════════════════

async def _check_item_status(entity, target_id, token, company_id, user_id=None):
    """Check if an item exists and return its current status + internal ID + queue membership.
    Returns (status_str, found_bool, internal_id, in_approval_queue).
    Prioritises the approval queue result — if the item is in the user's queue, that's authoritative.
    Falls back to the general list to detect "exists but not in your queue" scenarios.
    IMPORTANT: Verifies exact display number match (cartNo, poNo, rfqTitle) instead of
    blindly accepting the first fuzzy search result."""

    def _match_display_number(item, entity_type, search_id):
        """Check if a raw API item's display number matches what the user typed.
        Returns True if it matches (case-insensitive). Handles formats like:
        - Cart: cartNo = 'CART-1464', user types '1464' or 'CART-1464'
        - PO: purchaseOrderNo = 'PO-123', user types '123' or 'PO-123'
        - RFQ: rfqTitle = 'RFQ_12', user types '12' or 'RFQ_12'"""
        search_lower = str(search_id).lower().strip()
        candidates = []
        if entity_type == "cart":
            candidates = [
                str(item.get("cartNo") or ""),
                str(item.get("cartNumber") or ""),
                str(item.get("cart_no") or ""),
                str(item.get("cartId") or ""),
            ]
        elif entity_type == "po":
            candidates = [
                str(item.get("purchaseOrderNo") or ""),
                str(item.get("poNo") or ""),
                str(item.get("poNumber") or ""),
                str(item.get("po_number") or ""),
                str(item.get("purchaseOrderId") or ""),
            ]
        elif entity_type == "rfq":
            candidates = [
                str(item.get("rfqNumber") or ""),
                str(item.get("rfqTitle") or ""),
                str(item.get("title") or ""),
                str(item.get("rfqId") or ""),
            ]

        for c in candidates:
            c_lower = c.lower().strip()
            if not c_lower:
                continue
            # Exact match
            if c_lower == search_lower:
                return True
            # Match the numeric suffix: 'CART-1464' matches '1464'
            import re
            nums = re.findall(r'\d+', c_lower)
            if nums and search_lower in nums:
                return True
            # Match full display number input: user types 'CART-1464'
            if search_lower in c_lower or c_lower in search_lower:
                return True
        return False

    def _extract_info(data, entity_type, search_id):
        """Extract status, ID, and signoff metadata from API response."""
        items = data.get("items", []) if data else []
        if not items:
            return None, False, None, None, None
        # Find the exact match first
        matched_item = None
        for item in items:
            if _match_display_number(item, entity_type, search_id):
                matched_item = item
                break
        if not matched_item:
            return None, False, None, None, None
        item = matched_item
        status = (
            item.get("cartStatusType")
            or item.get("approvalDecision")
            or item.get("status")
            or item.get("orderStatus")
            or item.get("cartStatus")
            or item.get("rfqStatus")
            or item.get("signoffStatus")
            or ""
        )
        internal_id = (
            item.get("cartId")
            or item.get("PurchaseOrderId")
            or item.get("purchaseOrderId")
            or item.get("rfqId")
            or item.get("targetId")
            or item.get("id")
        )
        # Extract RFQ signoff metadata for approve/reject
        signoff_id = str(item.get("signoffId") or item.get("rfqSignoffId") or item.get("rfqSignOffId") or "") if entity_type == "rfq" else None
        rfq_signoff_user_id = str(item.get("rfqSignOffUserId") or item.get("rfqSignoffUserId") or "") if entity_type == "rfq" else None
        if entity_type == "rfq":
            logger.info(f"[EXTRACT-INFO] RFQ match: rfqId={internal_id}, signoffId={signoff_id}, rfqSignOffUserId={rfq_signoff_user_id}, status={status}, all_keys={list(item.keys())}")
        return str(status).strip(), True, internal_id, signoff_id, rfq_signoff_user_id

    try:
        # Build parallel tasks: [general_list, approval_queue]
        general_task = None
        queue_task = None

        if entity == "cart":
            general_task = get_carts_paginated(token, company_id, page=1, search=target_id)
        elif entity == "po":
            general_task = get_pos_paginated(token, company_id, page=1, search=target_id)
        elif entity == "rfq":
            # Try multiple search formats: plain ID, RFQ-prefixed, and rfqNumber
            general_task = get_rfqs_paginated(token, company_id, page=1, search=target_id)
        else:
            return None, False, None, False, None, None

        if user_id:
            if entity == "cart":
                queue_task = get_cart_approvals_paginated(token, company_id, str(user_id), page=1, search=target_id)
            elif entity == "po":
                queue_task = get_po_approvals_paginated(token, company_id, str(user_id), page=1, search=target_id)
            elif entity == "rfq":
                # Fetch ALL pending RFQ approvals (no search, large page) and match locally by rfqNumber
                # because the API search doesn't reliably match rfqNumber format
                queue_task = get_rfq_approvals_paginated(token, company_id, str(user_id), page=1, search="", page_size=50)

        # Run both in parallel
        tasks = [general_task] + ([queue_task] if queue_task else [])
        results = await asyncio.gather(*tasks, return_exceptions=True)

        general_result = results[0] if not isinstance(results[0], Exception) else None
        queue_result = results[1] if len(results) > 1 and not isinstance(results[1], Exception) else None

        # Priority 1: approval queue — authoritative for approve/reject actions
        q_status, q_found, q_id, q_signoff_id, q_rfq_signoff_user_id = _extract_info(queue_result, entity, target_id) if queue_result else (None, False, None, None, None)
        if q_found:
            logger.info(f"[CHECK-STATUS] Exact match in approval queue: status={q_status} id={q_id} signoff_id={q_signoff_id} rfq_signoff_user_id={q_rfq_signoff_user_id}")
            return q_status, True, q_id, True, q_signoff_id, q_rfq_signoff_user_id

        # Priority 2: general list — item exists but NOT in user's queue
        g_status, g_found, g_id, g_signoff_id, g_rfq_signoff_user_id = _extract_info(general_result, entity, target_id) if general_result else (None, False, None, None, None)
        if g_found:
            logger.info(f"[CHECK-STATUS] Exact match in general list only: status={g_status} id={g_id}")
            return g_status, True, g_id, False, g_signoff_id, g_rfq_signoff_user_id

        # Priority 3 (RFQ only): retry general search with RFQ-{id} prefix format
        if entity == "rfq" and not g_found and target_id.isdigit():
            try:
                general_retry = await get_rfqs_paginated(token, company_id, page=1, search=f"RFQ-{target_id}")
                g2_status, g2_found, g2_id, g2_signoff_id, g2_rfq_signoff_user_id = _extract_info(general_retry, entity, target_id)
                if g2_found:
                    logger.info(f"[CHECK-STATUS] Found RFQ via RFQ-{target_id} search: status={g2_status} id={g2_id}")
                    return g2_status, True, g2_id, False, g2_signoff_id, g2_rfq_signoff_user_id
            except Exception:
                pass

        return None, False, None, False, None, None
    except Exception:
        return None, False, None, False, None, None


async def _do_approve(entity, target_id, token, company_id, user_id, first_name, signoff_id=None, display_id=None, rfq_signoff_user_id=None):
    """Execute an approval action. Pre-validation is already done before the confirm prompt."""
    label = {"cart": "Cart", "po": "PO", "rfq": "RFQ"}.get(entity, entity.upper())
    show_id = display_id or target_id

    try:
        if entity == "cart":
            await approve_cart(token, company_id, target_id, user_id, first_name)
            await broadcast_cart_update({"type": "cart_approved", "cart_id": target_id})
        elif entity == "po":
            await approve_po(token, company_id, target_id, user_id, first_name)
            await broadcast_cart_update({"type": "po_approved", "po_id": target_id})
        elif entity == "rfq":
            if not signoff_id:
                return _error_response("Cannot approve RFQ: missing signoff ID.")
            await approve_rfq(token, company_id, target_id, signoff_id, user_id, first_name, rfq_signoff_user_id=rfq_signoff_user_id)
            await broadcast_cart_update({"type": "rfq_approved", "rfq_id": target_id})

        return _success_response(
            f"✅ {label} **{show_id}** has been approved!",
            suggestions=[f"View more {entity}s", "Back to menu"]
        )
    except ProcurementAPIError:
        raise  # Let the caller's confirm flow handle the error


async def _do_reject(entity, target_id, token, company_id, user_id, first_name, reason="", signoff_id=None, display_id=None, rfq_signoff_user_id=None):
    """Execute a rejection action. Pre-validation is already done before the confirm prompt."""
    label = {"cart": "Cart", "po": "PO", "rfq": "RFQ"}.get(entity, entity.upper())
    show_id = display_id or target_id

    try:
        if entity == "cart":
            await reject_cart(token, company_id, target_id, user_id, first_name, reason)
            await broadcast_cart_update({"type": "cart_rejected", "cart_id": target_id})
        elif entity == "po":
            await reject_po(token, company_id, target_id, user_id, first_name, reason)
            await broadcast_cart_update({"type": "po_rejected", "po_id": target_id})
        elif entity == "rfq":
            if not signoff_id:
                return _error_response("Cannot reject RFQ: missing signoff ID.")
            await reject_rfq(token, company_id, target_id, signoff_id, user_id, first_name, reason, rfq_signoff_user_id=rfq_signoff_user_id)
            await broadcast_cart_update({"type": "rfq_rejected", "rfq_id": target_id})

        return _success_response(
            f"❌ {label} **{show_id}** has been rejected.",
            suggestions=[f"View more {entity}s", "Back to menu"]
        )
    except ProcurementAPIError:
        raise  # Let the caller's confirm flow handle the error


# ═══════════════════════════════════════════════════════════
# MAIN CHAT ENDPOINT
# ═══════════════════════════════════════════════════════════

@router.post("/chat")
async def chat_endpoint(request: Request, message: Message):
    """
    Main chat handler.

    Accepts text (or voice-transcribed text) and returns structured
    JSON responses that the frontend renders as menus, lists,
    confirmations, or plain text.
    """
    text = (message.text or "").strip()
    session_id = message.session_id or "default"
    token = message.token or ""
    session = _get_session(session_id)

    # ── Parse intent (LLM-first with regex fallback) ──
    intent = await parse_intent_llm(text, session)
    action = intent["action"]
    entity = intent["entity"]
    target_id = intent["id"]
    page_num = intent["page"]
    search_q = intent["search"]

    # ── Safety override: fix entity when LLM confuses "rfq cart status" as cart ──
    lower_text = text.lower().strip()
    if entity == "cart" or (entity is None and action == "status"):
        if any(kw in lower_text for kw in ("rfq", "r.f.q", "quotation", "quote")):
            entity = "rfq"
            intent["entity"] = "rfq"
        elif any(kw in lower_text for kw in ("po ", "p.o", "purchase order")):
            entity = "po"
            intent["entity"] = "po"

    logger.info(f"[Chat] session={session_id} text='{text}' intent={intent}")

    # ── Auth guard ──
    if not token:
        return _text_response("🔒 Please log in to use the chatbot. I need your authentication to access the dashboard.")

    try:
        company_id = get_company_id_from_token(token)
        user_id = get_user_id_from_token(token)
        first_name = get_user_first_name_from_token(token) or "User"
    except Exception:
        return _error_response("Authentication error. Please log in again.")

    # ─────────────────────────────────────────────────
    # 0a. STATUS FILTER BUTTON — direct handler for status_filter:entity:STATUS
    # ─────────────────────────────────────────────────
    if lower_text.startswith("status_filter:"):
        # Use original text to preserve case of the status value (RFQ uses lowercase, Cart uses UPPERCASE)
        orig_parts = text.strip().split(":")
        parts = lower_text.split(":")
        if len(parts) == 3:
            _, filter_entity, _ = parts
            # Use original-case status from the button ID
            filter_status = orig_parts[2] if len(orig_parts) == 3 else parts[2].upper()
            print(f"[STATUS_FILTER HANDLER] entity={filter_entity}, status={filter_status}", flush=True)
            session["menu"] = filter_entity
            session["submenu"] = "status"
            session["status_filter"] = filter_status
            session["page"] = 1
            session["search"] = ""
            try:
                return await _build_list_response(
                    filter_entity, "status", token, company_id, str(user_id), 1, "", session, status_filter=filter_status
                )
            except (ProcurementAPIError, Exception) as e:
                logger.warning(f"[STATUS_FILTER] Error fetching {filter_entity} with status {filter_status}: {e}")
                return _text_response(f"No data found.")

    # ── Navigation shortcuts: "Back to last menu" / "Main menu" ──
    if lower_text in ("⬅️ back to last menu", "back to last menu", "back", "go back", "previous menu", "last menu"):
        last_entity = session.get("menu")
        if last_entity and last_entity in ("cart", "po", "rfq"):
            return _submenu_response(last_entity)
        return _menu_response()

    if lower_text in ("🏠 main menu", "main menu", "home", "start", "menu", "back to main"):
        session["menu"] = None
        session["submenu"] = None
        session["page"] = 1
        session["search"] = ""
        session["status_filter"] = None
        return _menu_response()

    # ─────────────────────────────────────────────────
    # 0b. NATURAL LANGUAGE STATUS FILTER (voice/typed)
    #     E.g. "show pending approval carts", "approved cart", "po generated", "rejected PO"
    # ─────────────────────────────────────────────────
    # Status keyword → (entity → correct API value) mapping
    # Cart API: UPPERCASE  |  PO API: UPPERCASE  |  RFQ API: lowercase
    _STATUS_KEYWORDS_BY_ENTITY = {
        # Values must match the actual API status field:
        # Cart: cartStatusType (UPPERCASE)  |  PO: orderStatus (UPPERCASE)
        # RFQ: signoffStatus via approvals endpoint (UPPERCASE)
        "approved":             {"cart": "APPROVED",              "po": "APPROVED",                 "rfq": "APPROVED"},
        "rejected":             {"cart": "REJECTED",              "po": "REJECTED",                 "rfq": "REJECTED"},
        "pending":              {"cart": "PENDING_APPROVAL",      "po": "PENDING_APPROVAL",         "rfq": None},
        "pending approval":     {"cart": "PENDING_APPROVAL",      "po": "PENDING_APPROVAL",         "rfq": None},
        "submitted":            {"cart": "SUBMITTED",             "po": "SUBMITTED",                "rfq": "SUBMITTED"},
        "draft":                {"cart": "DRAFT",                 "po": None,                       "rfq": "DRAFT"},
        "confirmed":            {"cart": None,                    "po": "CONFIRMED",                "rfq": None},
        "partially confirmed":  {"cart": None,                    "po": "PARTIALLY_CONFIRMED",      "rfq": None},
        "partially approved":   {"cart": None,                    "po": "PARTIALLY_APPROVED",       "rfq": None},
        "po generated":         {"cart": "POGENERATED",           "po": None,                       "rfq": None},
        "supplier shortlisted": {"cart": None,                    "po": None,                       "rfq": "SUPPLIER_SHORTLISTED"},
        "shortlisted":          {"cart": None,                    "po": None,                       "rfq": "SUPPLIER_SHORTLISTED"},
        "closed":               {"cart": None,                    "po": None,                       "rfq": "CLOSED"},
        "created":              {"cart": None,                    "po": None,                       "rfq": "DRAFT"},
        "completed":            {"cart": None,                    "po": None,                       "rfq": "CLOSED"},
        "cancelled":            {"cart": None,                    "po": None,                       "rfq": "CLOSED"},
    }
    _ENTITY_KEYWORDS = {
        "procurement carts": "cart", "procurement cart": "cart",
        "purchase orders": "po", "purchase order": "po",
        "carts": "cart", "cart": "cart",
        "pos": "po", "po": "po", "p.o": "po",
        "rfqs": "rfq", "rfq": "rfq", "quotations": "rfq", "quotation": "rfq", "r.f.q": "rfq",
    }
    # Map statuses that are unique to one entity (for fallback when entity not explicit)
    _STATUS_DEFAULT_ENTITY = {
        "approved": "cart",
        "po generated": "cart",
        "supplier shortlisted": "rfq", "shortlisted": "rfq",
        "confirmed": "po", "partially confirmed": "po", "partially approved": "po",
        "closed": "rfq", "created": "rfq", "completed": "rfq", "cancelled": "rfq",
    }

    # Skip NLP status detection if text looks like an approve/reject command with an ID
    import re as _re
    _has_action_id = _re.search(r'\b(approve|reject)\b.*\d', lower_text)

    if not _has_action_id:
        detected_entity = None
        matched_status_phrase = ""

        # 1. Match longest status phrases first
        for phrase in sorted(_STATUS_KEYWORDS_BY_ENTITY.keys(), key=len, reverse=True):
            if phrase in lower_text:
                matched_status_phrase = phrase
                break

        if matched_status_phrase:
            # 2. Remove matched status phrase before entity detection
            remaining_text = lower_text.replace(matched_status_phrase, " ").strip()

            for phrase in sorted(_ENTITY_KEYWORDS.keys(), key=len, reverse=True):
                if phrase in remaining_text:
                    detected_entity = _ENTITY_KEYWORDS[phrase]
                    break

            # 3. Fallback: if no entity found, infer from status
            if not detected_entity:
                detected_entity = _STATUS_DEFAULT_ENTITY.get(matched_status_phrase)

            if detected_entity:
                # Resolve the correct API status value for this entity
                api_status = _STATUS_KEYWORDS_BY_ENTITY[matched_status_phrase].get(detected_entity)
                if not api_status:
                    # This status doesn't apply to this entity — show friendly message
                    entity_labels = {"cart": "Cart", "po": "PO", "rfq": "RFQ"}
                    return _text_response(
                        f"**{matched_status_phrase.title()}** is not a valid status for {entity_labels.get(detected_entity, detected_entity.upper())}s."
                    )

                logger.info(f"[STATUS-NLP] Detected: entity={detected_entity} status={api_status} from text='{text}'")
                session["menu"] = detected_entity
                session["submenu"] = "status"
                session["status_filter"] = api_status
                session["page"] = 1
                session["search"] = ""
                try:
                    return await _build_list_response(
                        detected_entity, "status", token, company_id, str(user_id), 1, "", session, status_filter=api_status
                    )
                except (ProcurementAPIError, Exception) as e:
                    return _text_response(f"No data found.")

    # ─────────────────────────────────────────────────
    # 0b. REJECTION REASON FLOW — collect reason text
    # ─────────────────────────────────────────────────
    if session.get("pending_reject"):
        pr = session["pending_reject"]
        entity_label = {"cart": "Cart", "po": "PO", "rfq": "RFQ"}.get(pr["entity"], "Item")
        show_id = pr["target_id"]

        # Check if user wants to cancel
        if action == "deny" or (action is None and text.lower() in ("cancel", "no", "never mind", "stop")):
            session["pending_reject"] = None
            return _text_response("Rejection cancelled. How else can I help?")

        # Check if user wants to skip reason (just confirm immediately)
        if action == "confirm" or (action is None and text.lower() in ("skip", "no reason", "none")):
            reason = ""
        else:
            # Whatever the user typed is the rejection reason
            reason = text.strip()

        # Move to confirmation step with the reason
        session["pending_reject"] = None
        session["confirm_action"] = "reject"
        session["confirm_data"] = {
            "entity": pr["entity"],
            "target_id": show_id,
            "internal_id": pr["internal_id"],
            "reason": reason,
            "signoff_id": pr.get("signoff_id"),
            "rfq_signoff_user_id": pr.get("rfq_signoff_user_id"),
        }
        reason_display = f"\n\n**Reason:** {reason}" if reason else "\n\n**Reason:** _(none provided)_"
        return _confirm_response(
            f"Are you sure you want to **reject** {entity_label} **{show_id}**?{reason_display}",
            session["confirm_data"]
        )

    # ─────────────────────────────────────────────────
    # 1. CONFIRMATION FLOW — handle pending yes/no
    # ─────────────────────────────────────────────────
    if session["confirm_action"] and action in ("confirm", "deny", None):
        if action == "confirm" or (action is None and text.lower() in ("yes", "y", "confirm", "ok")):
            ca = session["confirm_action"]
            cd = session["confirm_data"]
            session["confirm_action"] = None
            session["confirm_data"] = None
            try:
                # Use internal_id for the API call (may differ from the display number the user typed)
                api_id = cd.get("internal_id") or cd["target_id"]
                logger.info(f"[CONFIRM-FLOW] action={ca} display_id={cd['target_id']}  api_id={api_id}")
                if ca == "approve":
                    return await _do_approve(
                        cd["entity"], api_id, token, company_id,
                        user_id, first_name, cd.get("signoff_id"),
                        display_id=cd["target_id"],
                        rfq_signoff_user_id=cd.get("rfq_signoff_user_id"),
                    )
                elif ca == "reject":
                    return await _do_reject(
                        cd["entity"], api_id, token, company_id,
                        user_id, first_name, cd.get("reason", ""), cd.get("signoff_id"),
                        display_id=cd["target_id"],
                        rfq_signoff_user_id=cd.get("rfq_signoff_user_id"),
                    )
                elif ca == "show_pending":
                    # User confirmed they want to see pending list
                    pending_entity = cd.get("entity", "cart")
                    pending_submenu = cd.get("submenu", "approve")
                    return await _build_list_response(
                        pending_entity, pending_submenu, token, company_id,
                        str(user_id), 1, "", session
                    )
            except ProcurementAPIError as e:
                err_str = str(e)
                entity_label = {"cart": "Cart", "po": "PO", "rfq": "RFQ"}.get(cd.get("entity", ""), "Item")
                show_id = cd.get("target_id", "")
                logger.error(f"[CONFIRM-FLOW] API error for {entity_label} {show_id}: {err_str}")
                if "400" in err_str.lower() or "bad request" in err_str.lower():
                    return _text_response(
                        f"❌ Could not {ca} {entity_label} **{show_id}**.\n\n"
                        f"The server rejected the request. This may mean the item's status has changed "
                        f"or you are not authorised for this action.\n\n"
                        "How else can I assist you?"
                    )
                if "404" in err_str.lower() or "not found" in err_str.lower():
                    return _text_response(
                        f"❌ {entity_label} **{show_id}** was not found on the server.\n\n"
                        "How else can I assist you?"
                    )
                return _error_response(f"Action failed: {e}")
        else:
            # User denied or said something else → cancel
            session["confirm_action"] = None
            session["confirm_data"] = None
            return _text_response("Action cancelled. How else can I help?")

    # ─────────────────────────────────────────────────
    # 2. GREET / HELP
    # ─────────────────────────────────────────────────
    if action == "greet":
        session["menu"] = None
        session["submenu"] = None
        return _menu_response()

    if action == "help":
        return _text_response(
            "I can help you manage **Carts**, **Purchase Orders**, and **RFQs**.\n\n"
            "Try saying:\n"
            "• **\"Cart\"** → open cart menu\n"
            "• **\"Approve cart 1414\"** → approve a specific cart\n"
            "• **\"PO status\"** → view purchase orders\n"
            "• **\"Search CART-123\"** → search for a specific item\n"
            "• **\"Back\"** → return to previous menu"
        )

    # ─────────────────────────────────────────────────
    # 3. BACK — go up one level
    # ─────────────────────────────────────────────────
    if action == "back":
        if session["submenu"]:
            session["submenu"] = None
            session["page"] = 1
            session["search"] = ""
            return _submenu_response(session["menu"])
        else:
            session["menu"] = None
            session["submenu"] = None
            session["page"] = 1
            session["search"] = ""
            return _menu_response()

    # ─────────────────────────────────────────────────
    # 4. NAVIGATE — open entity menu or submenu
    # ─────────────────────────────────────────────────
    if action == "navigate" and entity:
        # ── Context-aware redirect: if user types an entity ID while in approve/reject submenu ──
        # e.g., user is viewing "Carts Pending Rejection" and types "CART-1464" → treat as reject 1464
        # Also handles "RFQ_12" where parser may not extract the ID separately
        resolved_id = target_id
        if not resolved_id:
            # Try to extract any number from the text (e.g., "RFQ_12" → "12", "CART-1464" → "1464")
            import re as _re_nav
            num_match = _re_nav.search(r'(\d+)', text)
            if num_match:
                resolved_id = num_match.group(1)
        if resolved_id and session.get("submenu") in ("approve", "reject"):
            context_action = session["submenu"]  # 'approve' or 'reject'
            context_entity = session.get("menu") or entity
            logger.info(f"[NAVIGATE-REDIRECT] Redirecting '{text}' to {context_action} {context_entity} {resolved_id}")
            # Fall through to Section 6 by overriding action
            action = context_action
            entity = context_entity
            target_id = resolved_id
            target_entity = context_entity
            # Don't return — fall through to Section 6 below
        elif resolved_id and entity in ("cart", "po", "rfq"):
            # ── User typed "cart 1475" / "po 123" / "rfq 45" → show detail view directly ──
            logger.info(f"[NAVIGATE-DETAIL] Redirecting '{text}' to detail view for {entity} {resolved_id}")
            try:
                result = await _try_fetch_detail(entity, resolved_id, token, company_id)
                if result:
                    return result
                # Cross-search other entities if not found
                other_entities = [e for e in ("cart", "po", "rfq") if e != entity]
                for alt_entity in other_entities:
                    alt_result = await _try_fetch_detail(alt_entity, resolved_id, token, company_id)
                    if alt_result:
                        return alt_result
                return _text_response(
                    f"❌ No matching record found for **{resolved_id}**.\n\n"
                    "Try one of these:\n"
                    "• **\"Show carts\"** → Browse all carts\n"
                    "• **\"Show POs\"** → Browse all purchase orders\n"
                    "• **\"Show RFQs\"** → Browse all RFQs"
                )
            except ProcurementAPIError as e:
                return _error_response(f"Failed to load details: {e}")
        else:
            # Ticket form
            if entity == "ticket":
                return _ticket_form_response()

            # Budget is a direct fetch, not a submenu
            if entity == "budget":
                try:
                    budget_data = await get_budget_dashboard(token, company_id)

                    # Exact keys from the dashboard API
                    total = budget_data.get("totalAllocatedBudget", 0) or 0
                    available = budget_data.get("totalAvailableBudget", 0) or 0
                    used = total - available if isinstance(total, (int, float)) and isinstance(available, (int, float)) else 0
                    pct = round((used / total) * 100, 1) if total else 0

                    def fmt(v):
                        if isinstance(v, (int, float)):
                            return f"${v:,.2f}"
                        return str(v)

                    msg = (
                        f"💰 **Budget Dashboard**\n\n"
                        f"**Total Budget:** {fmt(total)}\n"
                        f"**Used:** {fmt(used)} ({pct}%)\n"
                        f"**Available:** {fmt(available)}\n"
                    )
                    return _text_response(msg)
                except ProcurementAPIError as e:
                    return _error_response(f"Failed to fetch budget: {e}")

            session["menu"] = entity
            session["submenu"] = None
            session["page"] = 1
            session["search"] = ""
            return _submenu_response(entity)

    # ─────────────────────────────────────────────────
    # 4b. VIEW DETAIL — drill-down into a single item
    # ─────────────────────────────────────────────────
    if action == "view_detail" and target_id:
        target_entity = entity or session.get("menu") or "cart"
        try:
            # Try the requested entity first
            result = await _try_fetch_detail(target_entity, target_id, token, company_id)
            if result:
                return result

            # Cross-search other entities if not found
            other_entities = [e for e in ("cart", "po", "rfq") if e != target_entity]
            for alt_entity in other_entities:
                alt_result = await _try_fetch_detail(alt_entity, target_id, token, company_id)
                if alt_result:
                    alt_label = {"cart": "Cart", "po": "PO", "rfq": "RFQ"}.get(alt_entity, alt_entity)
                    return alt_result

            # Not found anywhere
            return _text_response(
                f"❌ No matching record found for **{target_id}**.\n\n"
                "Try one of these:\n"
                "• **\"Show carts\"** → Browse all carts\n"
                "• **\"Show POs\"** → Browse all purchase orders\n"
                "• **\"Show RFQs\"** → Browse all RFQs"
            )
        except ProcurementAPIError as e:
            return _error_response(f"Failed to load details: {e}")

    # ─────────────────────────────────────────────────
    # 5. SUBMENU SELECTION (approve_menu / reject_menu / status)
    #    If status has a target_id, redirect to view_detail
    # ─────────────────────────────────────────────────
    if action in ("approve_menu", "reject_menu", "status"):
        # If status with a specific ID, show only that item (not a list)
        if action == "status" and target_id:
            target_entity = entity or session.get("menu") or "cart"
            try:
                # Try the requested entity first
                result = await _try_fetch_detail(target_entity, target_id, token, company_id)
                if result:
                    return result

                # Cross-search other entities if not found
                other_entities = [e for e in ("cart", "po", "rfq") if e != target_entity]
                for alt_entity in other_entities:
                    alt_result = await _try_fetch_detail(alt_entity, target_id, token, company_id)
                    if alt_result:
                        return alt_result

                # Not found anywhere
                return _text_response(
                    f"❌ No matching record found for **{target_id}**.\n\n"
                    "Try one of these:\n"
                    "• **\"Show carts\"** → Browse all carts\n"
                    "• **\"Show POs\"** → Browse all purchase orders\n"
                    "• **\"Show RFQs\"** → Browse all RFQs"
                )
            except ProcurementAPIError as e:
                return _error_response(f"Failed to load details: {e}")

        target_entity = entity or session.get("menu")
        if not target_entity:
            return _menu_response()

        submenu_key = action.replace("_menu", "") if action.endswith("_menu") else action
        session["menu"] = target_entity
        session["submenu"] = submenu_key
        session["page"] = 1
        session["search"] = ""

        # For status, show filter submenu to choose a status category first
        if submenu_key == "status":
            return _status_filter_response(target_entity)

        try:
            return await _build_list_response(
                target_entity, submenu_key, token, company_id, str(user_id), 1, "", session
            )
        except ProcurementAPIError as e:
            return _error_response(f"Failed to fetch data: {e}")

    # ─────────────────────────────────────────────────
    # 6. DIRECT APPROVE/REJECT with ID
    # ─────────────────────────────────────────────────
    if action in ("approve", "reject") and target_id:
        target_entity = entity or session.get("menu") or "cart"
        action_label = "approve" if action == "approve" else "reject"
        entity_label = {"cart": "Cart", "po": "PO", "rfq": "RFQ"}.get(target_entity, target_entity)

        # ── Pre-validate: check if the item exists and is in the user's approval queue ──
        status, found, internal_id, in_queue, signoff_id, rfq_signoff_user_id = await _check_item_status(
            target_entity, target_id, token, company_id, user_id=user_id
        )
        logger.info(f"[APPROVE/REJECT] target_id={target_id}  internal_id={internal_id}  status={status}  found={found}  in_queue={in_queue}  signoff_id={signoff_id}  rfq_signoff_user_id={rfq_signoff_user_id}")

        if not found:
            return _text_response(
                f"❌ {entity_label} **{target_id}** was not found.\n\n"
                "Please check the number and try again. How else can I assist you?"
            )

        if not in_queue:
            # Item exists in the system but is NOT in the current user's approval queue
            status_display = f" (current status: **{status}**)" if status else ""
            return _text_response(
                f"⚠️ {entity_label} **{target_id}**{status_display} is not in your approval queue.\n\n"
                f"Only assigned approvers can {action_label} this {entity_label.lower()}.\n\n"
                "How else can I assist you?"
            )

        if status and status.lower() not in (
            "pending approval", "pending", "awaiting approval",
            "submitted", "requested", "pending_approval",
        ):
            return _text_response(
                f"⚠️ {entity_label} **{target_id}** cannot be {action_label}d — "
                f"its current status is **{status}**.\n\n"
                "How else can I assist you?"
            )

        # Item exists, is in user's queue, and is eligible
        if action == "reject":
            # ── REJECTION: ask for reason first, then confirm ──
            session["pending_reject"] = {
                "entity": target_entity,
                "target_id": target_id,
                "internal_id": str(internal_id) if internal_id else target_id,
                "signoff_id": signoff_id,
                "rfq_signoff_user_id": rfq_signoff_user_id,
            }
            return _reject_reason_response(
                f"📝 Please provide a **reason** for rejecting {entity_label} **{target_id}**:",
                {
                    "entity": target_entity,
                    "target_id": target_id,
                    "entity_label": entity_label,
                }
            )
        else:
            # ── APPROVAL: ask for confirmation directly ──
            session["confirm_action"] = action
            session["confirm_data"] = {
                "entity": target_entity,
                "target_id": target_id,
                "internal_id": str(internal_id) if internal_id else target_id,
                "reason": "",
                "signoff_id": signoff_id,
                "rfq_signoff_user_id": rfq_signoff_user_id,
            }
            return _confirm_response(
                f"Are you sure you want to **{action_label}** {entity_label} **{target_id}**?",
                session["confirm_data"]
            )

    # ─────────────────────────────────────────────────
    # 7. SEARCH within current context
    # ─────────────────────────────────────────────────
    if action == "search" and search_q:
        target_entity = session.get("menu") or "cart"
        submenu_key = session.get("submenu") or "status"
        session["search"] = search_q
        session["page"] = 1
        try:
            return await _build_list_response(
                target_entity, submenu_key, token, company_id, str(user_id), 1, search_q, session
            )
        except ProcurementAPIError as e:
            return _error_response(f"Search failed: {e}")

    # ─────────────────────────────────────────────────
    # 7b. CLEAR SEARCH — reload current list without search
    # ─────────────────────────────────────────────────
    if action == "clear_search":
        target_entity = session.get("menu")
        submenu_key = session.get("submenu") or "status"
        session["search"] = ""
        session["page"] = 1
        if target_entity:
            try:
                return await _build_list_response(
                    target_entity, submenu_key, token, company_id, str(user_id), 1, "", session
                )
            except ProcurementAPIError as e:
                return _error_response(f"Failed to reload: {e}")
        return _menu_response()

    # ─────────────────────────────────────────────────
    # 8. PAGINATION
    # ─────────────────────────────────────────────────
    if action == "page":
        target_entity = session.get("menu")
        submenu_key = session.get("submenu")
        if not target_entity or not submenu_key:
            return _text_response("Please open a menu first, then navigate pages.")

        if page_num is not None and page_num > 0:
            session["page"] = page_num
        elif page_num == -1:
            session["page"] = max(1, session["page"] - 1)
        else:
            session["page"] = session["page"] + 1

        try:
            return await _build_list_response(
                target_entity, submenu_key, token, company_id, str(user_id),
                session["page"], session.get("search", ""), session
            )
        except ProcurementAPIError as e:
            return _error_response(f"Failed to load page: {e}")

    # ─────────────────────────────────────────────────
    # 9. NUMBER INPUT — select item from current list
    # ─────────────────────────────────────────────────
    if text.strip().isdigit() and session.get("submenu") in ("approve", "reject"):
        # User typed a number — treat as item selection from the list
        # We map numbers 1-5 to item index on current page.
        # But first, re-fetch the current page to get the item IDs
        choice = int(text.strip())
        target_entity = session.get("menu")
        submenu_key = session.get("submenu")
        if target_entity and 1 <= choice <= 5:
            try:
                data = await _fetch_list(
                    target_entity, submenu_key, token, company_id, str(user_id),
                    session["page"], session.get("search", "")
                )
                items = data.get("items", [])
                if choice <= len(items):
                    selected = items[choice - 1]
                    item_id = str(selected.get("cartId") or selected.get("purchaseOrderId") or selected.get("rfqId") or selected.get("id") or "")
                    signoff_id = str(selected.get("signoffId") or selected.get("rfqSignoffId") or "")
                    formatter = FORMATTERS.get(target_entity, lambda x: x)
                    formatted = formatter(selected)
                    item_title = formatted.get("title", item_id)

                    session["confirm_action"] = submenu_key
                    session["confirm_data"] = {
                        "entity": target_entity,
                        "target_id": item_id,
                        "signoff_id": signoff_id,
                        "reason": "",
                    }
                    action_label = submenu_key.capitalize()
                    return _confirm_response(
                        f"Are you sure you want to **{action_label}** **{item_title}**?",
                        session["confirm_data"]
                    )
                else:
                    return _text_response(f"Please select a number between 1 and {len(items)}.")
            except ProcurementAPIError as e:
                return _error_response(f"Error: {e}")

    # ─────────────────────────────────────────────────
    # 10. UNSUPPORTED ACTION — explicitly caught by pattern_service
    # ─────────────────────────────────────────────────
    if action == "unsupported":
        entity_label = {"cart": "Cart", "po": "Purchase Order", "rfq": "RFQ"}.get(entity, "item")
        entity_key = entity or "cart"

        # Detect specific unsupported verbs from the original text
        lower_text = text.lower().strip()
        if any(w in lower_text for w in ("create", "make", "new", "generate", "build", "setup")):
            verb = "create"
        elif any(w in lower_text for w in ("edit", "modify", "change", "alter", "update")):
            verb = "edit"
        elif any(w in lower_text for w in ("delete", "remove", "discard", "destroy")):
            verb = "delete"
        elif any(w in lower_text for w in ("cancel",)):
            verb = "cancel"
        elif any(w in lower_text for w in ("add", "put", "place")):
            verb = "add items to"
        else:
            verb = "perform this action on"

        suggestions = {
            "cart": (
                f"🚫 I'm not able to **{verb}** a {entity_label} at the moment.\n\n"
                "Here's what I **can** do with Carts:\n"
                "• **\"Show carts\"** → View all your carts\n"
                "• **\"Cart status\"** followed by a cart number → View a specific cart\n"
                "• **\"Approve cart\"** followed by a cart number → Approve a cart\n"
                "• **\"Reject cart\"** followed by a cart number → Reject a cart"
            ),
            "po": (
                f"🚫 I'm not able to **{verb}** a {entity_label} at the moment.\n\n"
                "Here's what I **can** do with POs:\n"
                "• **\"Show POs\"** → View all purchase orders\n"
                "• **\"PO status\"** followed by a PO number → View a specific PO\n"
                "• **\"Approve PO\"** followed by a PO number → Approve a PO\n"
                "• **\"Reject PO\"** followed by a PO number → Reject a PO"
            ),
            "rfq": (
                f"🚫 I'm not able to **{verb}** an {entity_label} at the moment.\n\n"
                "Here's what I **can** do with RFQs:\n"
                "• **\"Show RFQs\"** → View all quotations\n"
                "• **\"RFQ status\"** followed by an RFQ number → View a specific RFQ\n"
                "• **\"Approve RFQ\"** followed by an RFQ number → Approve an RFQ\n"
                "• **\"Reject RFQ\"** followed by an RFQ number → Reject an RFQ"
            ),
        }
        return _text_response(suggestions.get(entity_key, suggestions["cart"]))

    # ─────────────────────────────────────────────────
    # 11. SMART FALLBACK — unrecognized commands
    # ─────────────────────────────────────────────────

    # If we still have session context, show the submenu
    if entity and not action:
        session["menu"] = entity
        return _submenu_response(entity)

    if action is None or (action == "navigate" and not entity):
        # Completely unrecognized — show friendly help with examples
        return _text_response(
            "🤔 I didn't quite understand that. Here's what I can help with:\n\n"
            "**📋 Browse:**\n"
            "• **\"Cart\"** / **\"PO\"** / **\"RFQ\"** → Open menu\n"
            "• **\"Show carts\"** → View all carts\n\n"
            "**🔍 Lookup:**\n"
            "• **\"Cart status\"** + number → View a specific cart\n"
            "• **\"PO status\"** → View all POs\n\n"
            "**✅ Actions:**\n"
            "• **\"Approve cart\"** + number → Approve a cart\n"
            "• **\"Reject PO\"** + number → Reject a PO\n\n"
            "**💰 Other:**\n"
            "• **\"Budget\"** → View budget dashboard\n"
            "• **\"Raise ticket\"** → Submit support ticket\n"
            "• **\"Help\"** → See all commands"
        )

    # Final fallback — show main menu
    return _menu_response()


# ═══════════════════════════════════════════════════════════
# TICKET SUBMISSION ENDPOINT
# ═══════════════════════════════════════════════════════════

# In-memory ticket store (replace with real API/DB in production)
_tickets: list = []
_ticket_counter = 1000


@router.post("/submit-ticket")
async def submit_ticket(request: Request):
    """Accept a ticket submission from the chatbot form."""
    global _ticket_counter
    body = await request.json()
    subject = (body.get("subject") or "").strip()
    description = (body.get("description") or "").strip()
    priority = (body.get("priority") or "Medium").strip()
    token = body.get("token") or ""

    if not subject:
        return _error_response("Please provide a subject for your ticket.")
    if not description:
        return _error_response("Please provide a description for your ticket.")

    _ticket_counter += 1
    ticket_id = f"TKT-{_ticket_counter}"

    # Try to get user info from token
    user_name = "User"
    try:
        user_name = get_user_first_name_from_token(token) or "User"
    except Exception:
        pass

    _tickets.append({
        "id": ticket_id,
        "subject": subject,
        "description": description,
        "priority": priority,
        "status": "Open",
        "created_by": user_name,
        "created_at": __import__("datetime").datetime.now().isoformat(),
    })

    logger.info(f"[Ticket] Created {ticket_id}: {subject} ({priority})")

    return _success_response(
        f"✅ Ticket **{ticket_id}** has been raised successfully!\n\n"
        f"**Subject:** {subject}\n"
        f"**Priority:** {priority}\n"
        f"**Status:** Open\n\n"
        f"Our support team will get back to you shortly.",
        suggestions=["Back to menu"]
    )


@router.get("/budget")
async def budget_endpoint(request: Request):
    """Return budget data as JSON for the chatbot banner."""
    token = request.query_params.get("token", "")
    if not token:
        return {"total": 0, "available": 0}
    try:
        company_id = get_company_id_from_token(token)
        budget_data = await get_budget_dashboard(token, company_id)
        logger.info(f"[Budget] API keys: {list(budget_data.keys()) if isinstance(budget_data, dict) else type(budget_data)}")

        # Exact keys from the dashboard API (confirmed from BudgetDashboard.js)
        total = budget_data.get("totalAllocatedBudget", 0) or 0
        available = budget_data.get("totalAvailableBudget", 0) or 0

        return {"total": total, "available": available}
    except Exception as e:
        logger.error(f"[Budget] Error: {e}")
        return {"total": 0, "available": 0}