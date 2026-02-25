"""
Procurement API client — Complete overhaul.

Wraps all EVS Procure dashboard APIs with async calls, pagination support,
and unified error handling. Every function returns a standardized format
for paginated responses: { items: [], totalPages, currentPage, totalItems }.
"""

import httpx
import json as _json
import math
import logging
from datetime import datetime
from config.settings import settings
from config.constants import AUTH_API_BASE_URL

logger = logging.getLogger(__name__)

PAGE_SIZE = 5  # Show only 5 most recent items


class ProcurementAPIError(Exception):
    pass


# ─────────────────────────────────────────────────────────
# Internal HTTP helper
# ─────────────────────────────────────────────────────────

async def _request(method: str, url: str, token: str = None, **kwargs):
    """Fire an HTTP request with unified error handling."""
    headers = kwargs.pop("headers", {})
    headers["Content-Type"] = "application/json"
    headers["Accept"] = "application/json"
    if token:
        headers["Authorization"] = f"Bearer {token}"

    try:
        async with httpx.AsyncClient(timeout=settings.API_TIMEOUT) as client:
            resp = await client.request(method, url, headers=headers, **kwargs)
            resp.raise_for_status()
            if resp.status_code == 204:
                return {}
            return resp.json()
    except httpx.TimeoutException:
        raise ProcurementAPIError("The procurement system is not responding. Please try again.")
    except httpx.HTTPStatusError as e:
        try:
            body = e.response.json()
            detail = body.get("message") or body.get("detail") or body.get("error") or str(e)
        except Exception:
            detail = e.response.text[:200] or str(e)
        raise ProcurementAPIError(detail)
    except httpx.RequestError:
        raise ProcurementAPIError("Cannot connect to the procurement system.")


def _paginate(data, page_size, page_number):
    """Extract a standardised paginated response from raw API data."""
    if isinstance(data, dict):
        items = data.get("content") or data.get("data") or []
        total = data.get("totalElements") or data.get("total") or len(items)
    elif isinstance(data, list):
        items = data
        total = len(data)
    else:
        items = []
        total = 0

    total_pages = max(1, math.ceil(total / page_size)) if total else 1
    return {
        "items": items[:page_size] if isinstance(data, list) else items,
        "totalPages": total_pages,
        "currentPage": page_number + 1,
        "totalItems": total,
    }


# ═══════════════════════════════════════════════════════════
# CART APIs
# ═══════════════════════════════════════════════════════════

async def get_carts_paginated(
    token: str, company_id: int,
    page: int = 1, search: str = "", status: str = "",
    user_id: str = "",
) -> dict:
    """List carts with pagination, search, and status filter."""
    url = f"{AUTH_API_BASE_URL}/company/{company_id}/cart"
    params = {
        "pageSize": PAGE_SIZE,
        "pageNumber": page - 1,
        "sortBy": "createdDate",
        "order": "desc",
    }
    if search:
        params["search"] = search
    if status:
        params["status"] = status
    if user_id:
        params["userId"] = user_id
    data = await _request("GET", url, token=token, params=params)
    return _paginate(data, PAGE_SIZE, page - 1)


async def get_cart_approvals_paginated(
    token: str, company_id: int, approver_id: str,
    page: int = 1, search: str = "",
) -> dict:
    """List carts pending approval for a specific approver."""
    url = f"{AUTH_API_BASE_URL}/company/{company_id}/cart/{approver_id}/approvals"
    params = {
        "status": "pending",
        "pageSize": PAGE_SIZE,
        "pageNumber": page - 1,
        "sortBy": "updatedDate",
        "order": "desc",
    }
    if search:
        params["search"] = search
    data = await _request("GET", url, token=token, params=params)
    return _paginate(data, PAGE_SIZE, page - 1)


async def get_cart_by_id(token: str, company_id: int, cart_id: str) -> dict:
    """Get a single cart by ID."""
    url = f"{AUTH_API_BASE_URL}/company/{company_id}/cart/{cart_id}"
    return await _request("GET", url, token=token)


async def get_cart_detail(token: str, company_id: int, cart_id: str) -> list:
    """Get line-item details for a cart."""
    url = f"{AUTH_API_BASE_URL}/company/{company_id}/cart/cartDetail"
    data = await _request("GET", url, token=token, params={"cartId": cart_id})
    if isinstance(data, list):
        return data
    return data.get("content") or data.get("data") or []


async def get_catalog_items(token: str) -> dict:
    """Fetch all catalog items and return lookup dicts keyed by CatalogItemId and PartId."""
    url = f"{AUTH_API_BASE_URL}/catalogItem"
    try:
        data = await _request("GET", url, token=token)
        items = data if isinstance(data, list) else (data.get("content") or data.get("data") or [])
        lookup = {}
        for item in items:
            # Key by CatalogItemId (PascalCase from API)
            cat_id = str(item.get("CatalogItemId") or item.get("catalogItemId") or item.get("id") or "")
            if cat_id:
                lookup[cat_id] = item
            # Also key by PartId for broader matching
            part_id = str(item.get("PartId") or item.get("partId") or "")
            if part_id:
                lookup[part_id] = item
        return lookup
    except Exception:
        return {}


async def approve_cart(
    token: str, company_id: int, target_id: str,
    user_id, first_name: str, notes: str = "",
) -> dict:
    """Approve a cart — mirrors ApprovalsService.handleApproverCartApprove."""
    url = f"{AUTH_API_BASE_URL}/company/{company_id}/approval/indent/target/{target_id}/approve"
    uid = int(user_id) if str(user_id).isdigit() else user_id
    body = {
        "approvalDecision": "approved",
        "notes": notes,
        "user": {"userId": uid, "firstName": first_name},
        "documentId": "",
    }
    logger.info(f"[APPROVE-CART] URL={url}  body={body}")
    return await _request("POST", url, token=token, json=body)


async def reject_cart(
    token: str, company_id: int, target_id: str,
    user_id, first_name: str, reason: str = "",
) -> dict:
    """Reject a cart — mirrors ApprovalsService.handleApproverCartReject."""
    url = f"{AUTH_API_BASE_URL}/company/{company_id}/approval/indent/target/{target_id}/approve"
    uid = int(user_id) if str(user_id).isdigit() else user_id
    return await _request("POST", url, token=token, json={
        "approvalDecision": "rejected",
        "notes": reason or "Rejected via chatbot",
        "user": {"userId": uid, "firstName": first_name},
        "documentId": "",
    })


async def create_cart(token: str, company_id: int, **extra) -> dict:
    """Create a new cart."""
    url = f"{AUTH_API_BASE_URL}/company/{company_id}/cart"
    payload = {"companyId": company_id}
    if extra.get("shipToAddressId"):
        payload["shipToAddressId"] = extra["shipToAddressId"]
    return await _request("POST", url, token=token, json=payload)


async def submit_cart(token: str, company_id: int, cart_id: str, user_id: str) -> dict:
    """Submit a cart for approval."""
    url = (
        f"{AUTH_API_BASE_URL}/company/{company_id}/cart/{cart_id}/status"
        f"?userId={user_id}&newStatus=submitted"
    )
    return await _request("PATCH", url, token=token, json={})


async def delete_cart(token: str, company_id: int, cart_id: str) -> dict:
    """Delete a draft cart."""
    url = f"{AUTH_API_BASE_URL}/company/{company_id}/cart/{cart_id}"
    return await _request("DELETE", url, token=token)


async def duplicate_cart(token: str, company_id: int, cart_id: str) -> dict:
    """Duplicate an existing cart."""
    url = f"{AUTH_API_BASE_URL}/company/{company_id}/cart/{cart_id}/duplicate"
    return await _request("POST", url, token=token, json={})


async def add_item_to_cart(token: str, company_id: int, cart_id: str, item_data: dict) -> dict:
    """Add an item to a cart."""
    supplier_id = item_data.get("supplierId")
    if not supplier_id:
        supplier_id = await get_default_supplier_id(token, company_id)
    url = f"{AUTH_API_BASE_URL}/company/{company_id}/cart/{cart_id}/addDetail"
    body = {
        "cartId": int(cart_id) if str(cart_id).isdigit() else cart_id,
        "supplierId": supplier_id,
        "partId": item_data.get("partId", ""),
        "partDescription": item_data.get("partDescription", ""),
        "qty": item_data.get("qty", 1),
        "price": item_data.get("price", 0),
        "unitOfMeasure": item_data.get("unitOfMeasure", "piece"),
        "currencyCode": item_data.get("currencyCode", "USD"),
        "orderType": item_data.get("orderType", 0),
        "isCritical": item_data.get("isCritical", True),
        "productId": item_data.get("productId", 1),
    }
    return await _request("POST", url, token=token, json=body)


async def get_default_supplier_id(token: str, company_id: int):
    """Fetch connected suppliers and return the first supplierId."""
    url = f"{AUTH_API_BASE_URL}/company/{company_id}/supplierConnected"
    try:
        data = await _request("GET", url, token=token, params={"includeAllSuppliers": "true"})
        suppliers = data if isinstance(data, list) else (data.get("content") or [])
        if suppliers:
            return suppliers[0].get("supplierId") or suppliers[0].get("id")
    except Exception:
        pass
    return None


# ═══════════════════════════════════════════════════════════
# PURCHASE ORDER APIs
# ═══════════════════════════════════════════════════════════

async def get_pos_paginated(
    token: str, company_id: int,
    page: int = 1, search: str = "",
) -> dict:
    """List purchase orders with pagination and search."""
    url = f"{AUTH_API_BASE_URL}/company/{company_id}/purchaseOrder"
    params = {
        "pageSize": PAGE_SIZE,
        "pageNumber": page - 1,
        "sortBy": "orderPlacedDate",
        "order": "desc",
    }
    if search:
        params["search"] = search
    data = await _request("GET", url, token=token, params=params)
    return _paginate(data, PAGE_SIZE, page - 1)


async def get_po_approvals_paginated(
    token: str, company_id: int, approver_id: str,
    page: int = 1, search: str = "",
) -> dict:
    """List POs pending approval for a specific approver."""
    url = f"{AUTH_API_BASE_URL}/company/{company_id}/purchaseOrder/{approver_id}/approvals"
    params = {
        "status": "pending",
        "pageSize": PAGE_SIZE,
        "pageNumber": page - 1,
        "sortBy": "updatedDate",
        "order": "desc",
    }
    if search:
        params["search"] = search
    data = await _request("GET", url, token=token, params=params)
    return _paginate(data, PAGE_SIZE, page - 1)


async def get_po_item_details(token: str, company_id: int, po_id: str) -> dict:
    """Get PO line-item details."""
    url = f"{AUTH_API_BASE_URL}/company/{company_id}/purchaseOrder/{po_id}/itemDetails"
    return await _request("GET", url, token=token)


async def approve_po(
    token: str, company_id: int, target_id: str,
    user_id, first_name: str, notes: str = "",
) -> dict:
    """Approve a PO — mirrors ApprovalsService.handlePendingPOApprove."""
    url = f"{AUTH_API_BASE_URL}/company/{company_id}/approval/purchase_order/target/{target_id}/approve"
    uid = int(user_id) if str(user_id).isdigit() else user_id
    return await _request("POST", url, token=token, json={
        "approvalDecision": "approved",
        "notes": notes,
        "user": {"userId": uid, "firstName": first_name},
        "documentId": "",
    })


async def reject_po(
    token: str, company_id: int, target_id: str,
    user_id, first_name: str, reason: str = "",
) -> dict:
    """Reject a PO — mirrors ApprovalsService.handleApproverPOReject."""
    url = f"{AUTH_API_BASE_URL}/company/{company_id}/approval/purchase_order/target/{target_id}/approve"
    uid = int(user_id) if str(user_id).isdigit() else user_id
    return await _request("POST", url, token=token, json={
        "approvalDecision": "rejected",
        "notes": reason or "Rejected via chatbot",
        "user": {"userId": uid, "firstName": first_name},
        "documentId": "",
    })


async def get_pos_by_status(
    token: str, company_id: int, user_id: str,
    order_status: str, page: int = 1, search: str = "",
) -> dict:
    """List POs filtered by order status for a user."""
    url = f"{AUTH_API_BASE_URL}/company/{company_id}/purchaseOrder/{user_id}/byStatus"
    params = {
        "orderStatus": order_status,
        "pageSize": PAGE_SIZE,
        "pageNumber": page - 1,
        "sortBy": "orderPlacedDate",
        "order": "desc",
    }
    if search:
        params["search"] = search
    data = await _request("GET", url, token=token, params=params)
    return _paginate(data, PAGE_SIZE, page - 1)


# ═══════════════════════════════════════════════════════════
# RFQ APIs
# ═══════════════════════════════════════════════════════════

async def get_rfqs_paginated(
    token: str, company_id: int,
    page: int = 1, search: str = "",
) -> dict:
    """List RFQs with pagination and search."""
    url = f"{AUTH_API_BASE_URL}/company/{company_id}/rfqs"
    params = {
        "pageSize": PAGE_SIZE,
        "pageNumber": page - 1,
        "sortBy": "createdDate",
        "order": "desc",
    }
    if search:
        params["search"] = search
    data = await _request("GET", url, token=token, params=params)
    return _paginate(data, PAGE_SIZE, page - 1)


async def get_rfq_approvals_paginated(
    token: str, company_id: int, user_id: str,
    page: int = 1, search: str = "",
) -> dict:
    """List RFQs pending sign-off for a user."""
    url = f"{AUTH_API_BASE_URL}/company/{company_id}/rfqs/{user_id}/approvals"
    params = {
        "signoffStatus": "REQUESTED",
        "pageSize": PAGE_SIZE,
        "pageNumber": page - 1,
        "sortBy": "updatedDate",
        "order": "desc",
    }
    if search:
        params["search"] = search
    data = await _request("GET", url, token=token, params=params)
    return _paginate(data, PAGE_SIZE, page - 1)


async def get_rfq_by_id(token: str, company_id: int, rfq_id: str) -> dict:
    """Get a single RFQ by ID."""
    url = f"{AUTH_API_BASE_URL}/company/{company_id}/rfqs/{rfq_id}"
    return await _request("GET", url, token=token)


async def approve_rfq(
    token: str, company_id: int, rfq_id: str, signoff_id: str,
    user_id, first_name: str, notes: str = "",
) -> dict:
    """Approve an RFQ signoff — mirrors RfqApprovalService.approveRfqSignoff."""
    url = f"{AUTH_API_BASE_URL}/company/{company_id}/rfqs/{rfq_id}/signoffs/{signoff_id}/approve"
    uid = int(user_id) if str(user_id).isdigit() else user_id
    return await _request("POST", url, token=token, json={
        "signoffDecision": "approved",
        "notes": notes,
        "user": {"userId": uid, "firstName": first_name},
    })


async def reject_rfq(
    token: str, company_id: int, rfq_id: str, signoff_id: str,
    user_id, first_name: str, reason: str = "",
) -> dict:
    """Reject an RFQ signoff."""
    url = f"{AUTH_API_BASE_URL}/company/{company_id}/rfqs/{rfq_id}/signoffs/{signoff_id}/approve"
    uid = int(user_id) if str(user_id).isdigit() else user_id
    return await _request("POST", url, token=token, json={
        "signoffDecision": "rejected",
        "notes": reason or "Rejected via chatbot",
        "user": {"userId": uid, "firstName": first_name},
    })


# ═══════════════════════════════════════════════════════════
# UTILITY / SETTINGS
# ═══════════════════════════════════════════════════════════

async def get_user_settings_defaults(token: str, company_id: int) -> dict:
    """Fetch org data (addresses, departments, etc.) for cart creation."""
    results = {}
    endpoints = {
        "addresses": f"{AUTH_API_BASE_URL}/company/{company_id}/address",
        "departments": f"{AUTH_API_BASE_URL}/company/{company_id}/department",
        "locations": f"{AUTH_API_BASE_URL}/company/{company_id}/location",
        "projects": f"{AUTH_API_BASE_URL}/company/{company_id}/project",
    }
    for key, url in endpoints.items():
        try:
            data = await _request("GET", url, token=token)
            results[key] = data.get("content") or data if isinstance(data, (dict, list)) else []
        except Exception:
            results[key] = []

    def _pick(items, field):
        if items and len(items) == 1:
            return items[0].get(field) or items[0].get("id")
        return None

    results["shipToAddressId"] = _pick(results["addresses"], "addressId")
    results["departmentId"] = _pick(results["departments"], "departmentId")
    results["locationId"] = _pick(results["locations"], "locationId")
    results["projectId"] = _pick(results["projects"], "projectId")
    return results


async def check_health() -> dict:
    """Check if the API is reachable."""
    url = f"{AUTH_API_BASE_URL.rstrip('/').rsplit('/api', 1)[0]}"
    return await _request("GET", url)


# ═══════════════════════════════════════════════════════════
# BUDGET APIs
# ═══════════════════════════════════════════════════════════

async def get_budget_dashboard(token: str, company_id: int) -> dict:
    """Fetch total budget and remaining budget from the budget dashboard API."""
    url = f"{AUTH_API_BASE_URL}/company/{company_id}/budget/dashboard"
    return await _request("GET", url, token=token)
