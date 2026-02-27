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
    """List carts with pagination, search, and status filter.
    The cart API may not support server-side status filtering reliably,
    so when a status is specified we fetch a larger batch and filter
    by cartStatusType in Python (matching the dashboard approach)."""
    url = f"{AUTH_API_BASE_URL}/company/{company_id}/cart"

    if status:
        # Multi-page fetch: keep fetching pages until we have 5 matching items
        # or run out of data. This ensures we find the true 5 most recent
        # items for any status, even if matching items are scattered.
        batch_size = 50
        max_pages = 10  # Safety limit: fetch up to 500 items total
        status_lower = status.lower().replace("_", " ")
        filtered = []
        page_num = 0

        while len(filtered) < PAGE_SIZE and page_num < max_pages:
            params = {
                "pageSize": batch_size,
                "pageNumber": page_num,
                "sortBy": "createdDate",
                "order": "desc",
            }
            if search:
                params["search"] = search
            if user_id:
                params["userId"] = user_id
            data = await _request("GET", url, token=token, params=params)
            batch_items = data.get("content") or data.get("data") or (data if isinstance(data, list) else [])

            if not batch_items:
                break  # No more data from API

            # Log status values on first page for debugging
            if page_num == 0:
                statuses_found = set((c.get("cartStatusType") or "NONE") for c in batch_items)
                logger.info(f"[CART] Requested status='{status}', page 0 has {len(batch_items)} items. cartStatusType values: {statuses_found}")

            for c in batch_items:
                cart_status = (c.get("cartStatusType") or c.get("status") or "").lower().replace("_", " ")
                if cart_status == status_lower:
                    filtered.append(c)
                    if len(filtered) >= PAGE_SIZE:
                        break

            # If this page had fewer items than batch_size, we've reached the end
            if len(batch_items) < batch_size:
                break

            page_num += 1

        logger.info(f"[CART] Filter '{status_lower}': {len(filtered)} matches found across {page_num + 1} page(s)")
        return {
            "items": filtered[:PAGE_SIZE],
            "totalPages": 1,
            "currentPage": 1,
            "totalItems": len(filtered),
        }
    else:
        params = {
            "pageSize": PAGE_SIZE,
            "pageNumber": page - 1,
            "sortBy": "updatedDate",
            "order": "desc",
        }
        if search:
            params["search"] = search
        if user_id:
            params["userId"] = user_id
        data = await _request("GET", url, token=token, params=params)
        return _paginate(data, PAGE_SIZE, page - 1)


async def get_cart_approvals_paginated(
    token: str, company_id: int, approver_id: str,
    page: int = 1, search: str = "", status: str = "pending",
) -> dict:
    """List cart approvals for a specific approver. status: pending/approved/rejected."""
    url = f"{AUTH_API_BASE_URL}/company/{company_id}/cart/{approver_id}/approvals"
    params = {
        "status": status,
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
    page: int = 1, search: str = "", status: str = "",
    user_id: str = "",
) -> dict:
    """List purchase orders with pagination, search, and optional status filter.
    When a status is provided, uses the /byStatus endpoint (same as dashboard)
    which supports server-side orderStatus filtering."""
    if status and user_id:
        # Use the byStatus endpoint — same as the dashboard's getPOsByStatusForUser
        url = f"{AUTH_API_BASE_URL}/company/{company_id}/purchaseOrder/{user_id}/byStatus"
        params = {
            "orderStatus": status,
            "pageSize": PAGE_SIZE,
            "pageNumber": page - 1,
            "sortBy": "orderPlacedDate",
            "order": "desc",
        }
        if search:
            params["search"] = search
        logger.info(f"[PO] Using byStatus endpoint: {url} with orderStatus='{status}'")
        data = await _request("GET", url, token=token, params=params)
        items = data.get("content") or data.get("data") or (data if isinstance(data, list) else [])
        logger.info(f"[PO] byStatus returned {len(items)} items for status='{status}'")
        if items:
            logger.info(f"[PO] First item keys: {list(items[0].keys())[:15]}")
        return {
            "items": items[:PAGE_SIZE],
            "totalPages": data.get("totalPages", 1),
            "currentPage": page,
            "totalItems": data.get("totalElements", len(items)),
        }
    elif status:
        # Fallback: no user_id, use general endpoint with client-side filter
        url = f"{AUTH_API_BASE_URL}/company/{company_id}/purchaseOrder"
        batch_size = 50
        max_pages = 10
        status_lower = status.lower().replace("_", " ")
        filtered = []
        page_num = 0

        while len(filtered) < PAGE_SIZE and page_num < max_pages:
            params = {
                "pageSize": batch_size,
                "pageNumber": page_num,
                "sortBy": "orderPlacedDate",
                "order": "desc",
            }
            if search:
                params["search"] = search
            data = await _request("GET", url, token=token, params=params)
            batch_items = data.get("content") or data.get("data") or (data if isinstance(data, list) else [])

            if not batch_items:
                break

            for po in batch_items:
                po_status = (po.get("orderStatus") or po.get("status") or po.get("poStatus") or "").lower().replace("_", " ")
                if po_status == status_lower:
                    filtered.append(po)
                    if len(filtered) >= PAGE_SIZE:
                        break

            if len(batch_items) < batch_size:
                break
            page_num += 1

        return {
            "items": filtered[:PAGE_SIZE],
            "totalPages": 1,
            "currentPage": 1,
            "totalItems": len(filtered),
        }
    else:
        params = {
            "pageSize": PAGE_SIZE,
            "pageNumber": page - 1,
            "sortBy": "lastModifiedDate",
            "order": "desc",
        }
        if search:
            params["search"] = search
        data = await _request("GET", url, token=token, params=params)
        return _paginate(data, PAGE_SIZE, page - 1)


async def get_po_approvals_paginated(
    token: str, company_id: int, approver_id: str,
    page: int = 1, search: str = "", status: str = "pending",
) -> dict:
    """List PO approvals for a specific approver. status: pending/approved/rejected."""
    url = f"{AUTH_API_BASE_URL}/company/{company_id}/purchaseOrder/{approver_id}/approvals"
    params = {
        "status": status,
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
#  APIs
# ═══════════════════════════════════════════════════════════

async def get_rfqs_paginated(
    token: str, company_id: int,
    page: int = 1, search: str = "", status: str = "",
) -> dict:
    """List RFQs with pagination, search, and status filter.
    The RFQ API ignores the rfqStatus query param — the dashboard shows
    all RFQs and filters client-side. We replicate that here."""
    url = f"{AUTH_API_BASE_URL}/company/{company_id}/rfqs"

    if status:
        # Fetch 10 items (matching dashboard page size) to cover more statuses
        params = {
            "pageSize": 50,
            "pageNumber": 0,
            "sortBy": "createdDate",
            "order": "desc",
        }
        if search:
            params["search"] = search
        data = await _request("GET", url, token=token, params=params)
        all_items = data.get("content") or data.get("data") or (data if isinstance(data, list) else [])
        logger.info(f"[RFQ GENERAL] Fetched {len(all_items)} items from /rfqs endpoint")
        if all_items:
            rfq_statuses_found = set((r.get("rfqStatus") or "NONE") for r in all_items)
            logger.info(f"[RFQ GENERAL] rfqStatus values: {rfq_statuses_found}")
        status_lower = status.lower().replace("_", " ")
        filtered = [
            r for r in all_items
            if (r.get("rfqStatus") or r.get("status") or "").lower().replace("_", " ") == status_lower
        ]
        logger.info(f"[RFQ GENERAL] Filter='{status}' -> '{status_lower}': {len(filtered)} matches")
        return {
            "items": filtered[:PAGE_SIZE],
            "totalPages": 1,
            "currentPage": 1,
            "totalItems": len(filtered),
        }
    else:
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


async def get_rfqs_by_status(
    token: str, company_id: int, user_id: str = "",
    signoff_status: str = "REQUESTED", page: int = 1, search: str = "",
) -> dict:
    """List RFQs filtered by status using the general /rfqs endpoint.

    Uses multi-page fetching with client-side rfqStatus filtering.
    Includes status aliases (e.g. DRAFT also matches 'created').
    """
    # The API may use different rfqStatus values than our UI labels.
    _STATUS_ALIASES = {
        "draft": ["draft", "created"],  # API uses 'created' for draft RFQs
    }

    url = f"{AUTH_API_BASE_URL}/company/{company_id}/rfqs"
    batch_size = 50
    max_pages = 10
    status_lower = signoff_status.lower().replace("_", " ")
    match_values = _STATUS_ALIASES.get(status_lower, [status_lower])

    filtered = []
    page_num = 0

    while len(filtered) < PAGE_SIZE and page_num < max_pages:
        params = {
            "pageSize": batch_size,
            "pageNumber": page_num,
            "sortBy": "createdDate",
            "order": "desc",
        }
        if search:
            params["search"] = search
        data = await _request("GET", url, token=token, params=params)
        batch_items = data.get("content") or data.get("data") or (data if isinstance(data, list) else [])

        if not batch_items:
            break

        if page_num == 0:
            rfq_statuses_found = set((r.get("rfqStatus") or "NONE") for r in batch_items)
            logger.info(f"[RFQ BY STATUS] Requested '{signoff_status}', page 0 has {len(batch_items)} items. rfqStatus values: {rfq_statuses_found}")

        for r in batch_items:
            rfq_status = (r.get("rfqStatus") or r.get("status") or "").lower().replace("_", " ")
            if rfq_status in match_values:
                filtered.append(r)
                if len(filtered) >= PAGE_SIZE:
                    break

        if len(batch_items) < batch_size:
            break

        page_num += 1

    logger.info(f"[RFQ BY STATUS] Filter '{status_lower}' (aliases={match_values}): {len(filtered)} matches across {page_num + 1} page(s)")

    return {
        "items": filtered[:PAGE_SIZE],
        "totalPages": 1,
        "currentPage": 1,
        "totalItems": len(filtered),
    }


async def get_rfq_approvals_paginated(
    token: str, company_id: int, user_id: str,
    page: int = 1, search: str = "", signoff_status: str = "REQUESTED",
) -> dict:
    """List RFQ approvals for a user. signoff_status: REQUESTED/APPROVED/REJECTED."""
    url = f"{AUTH_API_BASE_URL}/company/{company_id}/rfqs/{user_id}/approvals"
    params = {
        "signoffStatus": signoff_status,
        "pageSize": PAGE_SIZE,
        "pageNumber": page - 1,
        "sortBy": "updatedDate",
        "order": "desc",
    }
    if search:
        params["search"] = search
    data = await _request("GET", url, token=token, params=params)
    logger.info(f"[RFQ APPROVALS RAW] url={url}, signoffStatus={signoff_status}, raw keys={list(data.keys()) if isinstance(data, dict) else 'list'}, content count={len(data.get('content', []) if isinstance(data, dict) else data)}")
    return _paginate(data, PAGE_SIZE, page - 1)


async def get_rfq_by_id(token: str, company_id: int, rfq_id: str) -> dict:
    """Get a single RFQ by ID."""
    url = f"{AUTH_API_BASE_URL}/company/{company_id}/rfqs/{rfq_id}"
    return await _request("GET", url, token=token)


async def approve_rfq(
    token: str, company_id: int, rfq_id: str, signoff_id: str,
    user_id, first_name: str, notes: str = "",
    rfq_signoff_user_id=None,
) -> dict:
    """Approve an RFQ signoff — uses the correct API body format."""
    url = f"{AUTH_API_BASE_URL}/company/{company_id}/rfqs/{rfq_id}/signoffs/{signoff_id}/approve"
    uid = int(user_id) if str(user_id).isdigit() else user_id
    signoff_user_id = int(rfq_signoff_user_id) if rfq_signoff_user_id and str(rfq_signoff_user_id).isdigit() else rfq_signoff_user_id
    signoff_id_int = int(signoff_id) if str(signoff_id).isdigit() else signoff_id
    body = {
        "rfqSignOffUserId": signoff_user_id or uid,
        "rfqSignOffId": signoff_id_int,
        "signoffUserId": {"userId": uid},
        "signoffStatus": "approved",
        "comments": notes or "Approved via chatbot",
        "isActive": True,
    }
    logger.info(f"[APPROVE-RFQ] URL={url}  body={body}")
    return await _request("PUT", url, token=token, json=body)


async def reject_rfq(
    token: str, company_id: int, rfq_id: str, signoff_id: str,
    user_id, first_name: str, reason: str = "",
    rfq_signoff_user_id=None,
) -> dict:
    """Reject an RFQ signoff — uses the correct API body format."""
    url = f"{AUTH_API_BASE_URL}/company/{company_id}/rfqs/{rfq_id}/signoffs/{signoff_id}/approve"
    uid = int(user_id) if str(user_id).isdigit() else user_id
    signoff_user_id = int(rfq_signoff_user_id) if rfq_signoff_user_id and str(rfq_signoff_user_id).isdigit() else rfq_signoff_user_id
    signoff_id_int = int(signoff_id) if str(signoff_id).isdigit() else signoff_id
    body = {
        "rfqSignOffUserId": signoff_user_id or uid,
        "rfqSignOffId": signoff_id_int,
        "signoffUserId": {"userId": uid},
        "signoffStatus": "rejected",
        "comments": reason or "Rejected via chatbot",
        "isActive": True,
    }
    logger.info(f"[REJECT-RFQ] URL={url}  body={body}")
    return await _request("PUT", url, token=token, json=body)


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
