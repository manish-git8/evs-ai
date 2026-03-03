"""
Cart management route handlers.

This module handles cart CRUD operations, approval, and rejection.
Includes both the legacy /approve-cart endpoint and new /api/cart/* endpoints.
"""

import time
from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException, Request, Query

from models.schemas import (
    ApproveCartRequest,
    CartCreateRequest,
    CartApproveRequest,
    CartRejectRequest,
)
from services.cart_service import (
    approve_cart,
    create_cart,
    create_cart_with_items,
    get_cart_details,
    get_pending_approval_carts,
    get_all_carts,
)
from utils.rate_limiter import limiter, RATE_LIMIT_CART
from utils.websocket_manager import broadcast_cart_update
from utils.audit_logger import log_action, log_error
from jwt_utils import (
    get_company_id_from_token,
    get_user_id_from_token,
    get_user_first_name_from_token,
    get_user_name_from_token,
    decode_jwt_token,
)

# Create router for cart endpoints
router = APIRouter()

# Sequential counters for reference number generation
_approve_counter = 0
_reject_counter = 0


def _generate_reference(prefix: str) -> str:
    """Generate a unique reference number like AP-2026-0001 or RJ-2026-0001."""
    global _approve_counter, _reject_counter
    year = datetime.now(timezone.utc).year
    if prefix == "AP":
        _approve_counter += 1
        seq = _approve_counter
    else:
        _reject_counter += 1
        seq = _reject_counter
    return f"{prefix}-{year}-{seq:04d}"


# ═══════════════════════════════════════════════════════
# LEGACY ENDPOINT (kept for backward compatibility)
# ═══════════════════════════════════════════════════════

@router.post("/approve-cart")
@limiter.limit(RATE_LIMIT_CART)
async def approve_cart_endpoint(request: Request, approve_request: ApproveCartRequest):
    """
    Approve or reject a cart for the authenticated user (legacy endpoint).
    
    Args:
        request: FastAPI Request object (required for rate limiting)
        approve_request: ApproveCartRequest model containing cartId, token, decision, and notes
        
    Returns:
        Dictionary containing:
        - success: Boolean indicating operation success
        - message: Success message
        - cartId: ID of the approved/rejected cart
        
    Raises:
        HTTPException: If approval/rejection fails or validation fails
    """
    try:
        token = approve_request.token
        cart_id = approve_request.cartId
        decision = approve_request.decision or "approved"
        notes = approve_request.notes or ""
        
        # Validate that notes are provided for rejection
        if decision.lower() == "rejected" and not notes.strip():
            raise HTTPException(
                status_code=400,
                detail="Notes are required when rejecting a cart. Please provide a reason for rejection."
            )
        
        # Extract user details from token
        company_id = get_company_id_from_token(token)
        user_id = get_user_id_from_token(token)
        first_name = get_user_first_name_from_token(token)
        
        if not user_id:
            raise HTTPException(
                status_code=400,
                detail="Could not extract user ID from token. Please ensure you are authenticated."
            )
        
        if not first_name:
            # If first name is not found, try to extract from full name
            jwt_data = decode_jwt_token(token)
            full_name = jwt_data.get("name") or jwt_data.get("userName") or jwt_data.get("fullName") or ""
            first_name = full_name.split()[0] if full_name else "User"
        
        # ── Resolve cart number to internal cart ID ──
        # Voice commands may send a displayed cart number (e.g. 1020) rather than
        # the internal cartId (e.g. 97826). Resolve it by checking pending carts.
        resolved_cart_id = cart_id
        try:
            pending = await get_pending_approval_carts(token, company_id, int(user_id))
            carts = pending.get("carts", [])
            cart_id_str = str(cart_id)
            for c in carts:
                c_no = str(c.get("cartNo", "")).replace("CART-", "").strip()
                c_id = str(c.get("cartId", ""))
                if c_no == cart_id_str or c_id == cart_id_str:
                    resolved_cart_id = int(c_id) if c_id.isdigit() else c.get("cartId", cart_id)
                    break
        except Exception:
            pass  # Cart number resolution is best-effort

        # Call the approve cart function with decision and notes
        result = await approve_cart(token, company_id, resolved_cart_id, user_id, first_name, decision, notes)
        
        action = "approved" if decision.lower() == "approved" else "rejected"

        # Broadcast status change so other connected clients update
        try:
            await broadcast_cart_update({
                "type": f"cart_{action}",
                "cart_id": str(cart_id),
                "user_id": str(user_id),
            })
        except Exception:
            pass  # Non-critical — don't fail the approval over a broadcast error

        return {
            "success": True,
            "message": f"✅ Cart {action} successfully!",
            "cartId": cart_id
        }
        
    except HTTPException:
        raise
    except Exception as e:
        log_error(
            "Unexpected error in approve_cart_endpoint",
            details={"error": str(e), "cart_id": cart_id, "decision": decision},
            exc_info=True
        )
        raise HTTPException(status_code=500, detail="Cart approval error occurred")


# ═══════════════════════════════════════════════════════
# NEW API ENDPOINTS
# ═══════════════════════════════════════════════════════

@router.post("/api/cart/create")
@limiter.limit(RATE_LIMIT_CART)
async def api_create_cart(request: Request, cart_request: CartCreateRequest):
    """
    Create a new procurement cart with items.
    
    Revalidates stock atomically before creation.
    Generates unique cart ID and sets initial status = pending_approval.
    
    Args:
        cart_request: CartCreateRequest with user_id, items, total, and optional token
        
    Returns:
        Dictionary with cart_id, status, and created_at
    """
    try:
        token = cart_request.token
        if not token:
            raise HTTPException(status_code=401, detail="Authentication token is required.")
        
        company_id = get_company_id_from_token(token)
        
        items = [{"sku": item.sku, "qty": item.qty, "unit_price": item.unit_price} for item in cart_request.items]
        
        result = await create_cart_with_items(
            token=token,
            company_id=company_id,
            user_id=cart_request.user_id,
            items=items,
            total=cart_request.total,
        )
        
        log_action("cart_created_with_items", details={
            "cart_id": result.get("cart_id"),
            "user_id": cart_request.user_id,
            "item_count": len(items),
            "total": cart_request.total,
        }, user_id=cart_request.user_id)
        
        return {
            "cart_id": result["cart_id"],
            "status": result["status"],
            "created_at": result["created_at"],
        }
        
    except HTTPException:
        raise
    except Exception as e:
        log_error(
            "Unexpected error in api_create_cart",
            details={"error": str(e), "user_id": cart_request.user_id},
            exc_info=True,
        )
        raise HTTPException(status_code=500, detail=f"Cart creation failed: {str(e)}")


@router.get("/api/cart/{cart_id}")
async def api_get_cart(request: Request, cart_id: str, token: str = Query(None)):
    """
    Retrieve full details of a specific cart.
    
    Args:
        cart_id: Cart ID or cart number
        token: JWT token (query parameter)
        
    Returns:
        Full cart details including items, status, approval info
    """
    try:
        if not token:
            raise HTTPException(status_code=401, detail="Authentication token is required (pass as ?token=...).")
        
        company_id = get_company_id_from_token(token)
        result = await get_cart_details(token, str(cart_id), company_id)
        
        if not result.get("success"):
            raise HTTPException(status_code=404, detail="Cart not found.")
        
        cart = result["cart"]
        
        # Reshape to the spec format
        items_list = []
        cart_items = cart.get("cartItems") or cart.get("items") or []
        for ci in cart_items:
            items_list.append({
                "sku": ci.get("sku") or ci.get("itemCode") or ci.get("productCode") or "",
                "description": ci.get("description") or ci.get("itemDescription") or ci.get("productName") or "",
                "qty": ci.get("qty") or ci.get("quantity") or 0,
                "unit_price": ci.get("unitPrice") or ci.get("unit_price") or 0.0,
                "total": ci.get("total") or ci.get("amount") or (
                    (ci.get("qty") or ci.get("quantity") or 0) * (ci.get("unitPrice") or ci.get("unit_price") or 0)
                ),
            })
        
        response = {
            "cart_id": str(cart.get("cartId", cart_id)),
            "requester_id": str(cart.get("requesterId") or cart.get("createdById") or cart.get("userId") or ""),
            "requester_name": cart.get("requesterName") or cart.get("createdByName") or cart.get("userName") or "",
            "items": items_list,
            "total": cart.get("totalAmount") or cart.get("amount") or cart.get("total") or 0.0,
            "status": (cart.get("cartStatus") or cart.get("status") or "unknown").lower(),
            "created_at": cart.get("createdDate") or cart.get("created_at") or "",
        }
        
        # Optional approval fields
        if cart.get("approvedBy") or cart.get("approverName"):
            response["approved_by"] = cart.get("approvedBy") or cart.get("approverName") or ""
        if cart.get("approvedDate") or cart.get("approved_at"):
            response["approved_at"] = cart.get("approvedDate") or cart.get("approved_at") or ""
        if cart.get("rejectedBy") or cart.get("rejecterName"):
            response["rejected_by"] = cart.get("rejectedBy") or cart.get("rejecterName") or ""
        if cart.get("rejectedDate") or cart.get("rejected_at"):
            response["rejected_at"] = cart.get("rejectedDate") or cart.get("rejected_at") or ""
        if cart.get("rejectionReason") or cart.get("rejection_reason") or cart.get("notes"):
            response["rejection_reason"] = cart.get("rejectionReason") or cart.get("rejection_reason") or cart.get("notes") or ""
        
        log_action("cart_status_retrieved", details={
            "cart_id": cart_id,
            "status": response["status"],
        })
        
        return response
        
    except HTTPException:
        raise
    except Exception as e:
        log_error(
            "Unexpected error in api_get_cart",
            details={"error": str(e), "cart_id": cart_id},
            exc_info=True,
        )
        raise HTTPException(status_code=500, detail=f"Failed to retrieve cart: {str(e)}")


@router.get("/api/cart/pending")
async def api_get_pending_carts(
    request: Request,
    approver_id: str = Query(..., description="User ID of the approver"),
    token: str = Query(None),
):
    """
    List all carts pending approval for a given approver.
    
    Args:
        approver_id: User ID of the approver
        token: JWT token (query parameter)
        
    Returns:
        Dictionary with pending_carts list (max 10 items)
    """
    try:
        if not token:
            raise HTTPException(status_code=401, detail="Authentication token is required.")
        
        company_id = get_company_id_from_token(token)
        result = await get_pending_approval_carts(token, company_id, int(approver_id))
        
        if not result.get("success"):
            return {"pending_carts": []}
        
        carts = result.get("carts", [])
        
        # Reshape and limit to 10 items
        pending_carts = []
        for cart in carts[:10]:
            cart_items = cart.get("cartItems") or cart.get("items") or []
            pending_carts.append({
                "cart_id": str(cart.get("cartId", "")),
                "requester_name": cart.get("requesterName") or cart.get("createdByName") or cart.get("userName") or "",
                "total": cart.get("totalAmount") or cart.get("amount") or cart.get("total") or 0.0,
                "item_count": len(cart_items) if cart_items else cart.get("itemCount", 0),
                "created_at": cart.get("createdDate") or cart.get("created_at") or "",
            })
        
        log_action("pending_carts_retrieved", details={
            "approver_id": approver_id,
            "count": len(pending_carts),
        }, user_id=approver_id)
        
        return {"pending_carts": pending_carts}
        
    except HTTPException:
        raise
    except Exception as e:
        log_error(
            "Unexpected error in api_get_pending_carts",
            details={"error": str(e), "approver_id": approver_id},
            exc_info=True,
        )
        raise HTTPException(status_code=500, detail=f"Failed to retrieve pending carts: {str(e)}")


@router.post("/api/cart/approve")
@limiter.limit(RATE_LIMIT_CART)
async def api_approve_cart(request: Request, approve_request: CartApproveRequest):
    """
    Approve a cart. Generates unique reference number (AP-2026-xxxx).
    
    Args:
        approve_request: CartApproveRequest with cart_id, approver_id, and optional token
        
    Returns:
        Dictionary with reference, status, and approved_at timestamp
    """
    try:
        token = approve_request.token
        if not token:
            raise HTTPException(status_code=401, detail="Authentication token is required.")
        
        company_id = get_company_id_from_token(token)
        user_id = int(approve_request.approver_id)
        first_name = get_user_first_name_from_token(token)
        
        if not first_name:
            jwt_data = decode_jwt_token(token)
            full_name = jwt_data.get("name") or jwt_data.get("userName") or jwt_data.get("fullName") or ""
            first_name = full_name.split()[0] if full_name else "User"
        
        await approve_cart(
            token, company_id, int(approve_request.cart_id),
            user_id, first_name, "approved", ""
        )
        
        reference = _generate_reference("AP")
        approved_at = datetime.now(timezone.utc).isoformat()
        
        log_action("cart_approved_api", details={
            "cart_id": approve_request.cart_id,
            "approver_id": approve_request.approver_id,
            "reference": reference,
        }, user_id=approve_request.approver_id)
        
        return {
            "reference": reference,
            "status": "approved",
            "approved_at": approved_at,
        }
        
    except HTTPException:
        raise
    except Exception as e:
        log_error(
            "Unexpected error in api_approve_cart",
            details={"error": str(e), "cart_id": approve_request.cart_id},
            exc_info=True,
        )
        raise HTTPException(status_code=500, detail=f"Cart approval failed: {str(e)}")


@router.post("/api/cart/reject")
@limiter.limit(RATE_LIMIT_CART)
async def api_reject_cart(request: Request, reject_request: CartRejectRequest):
    """
    Reject a cart. Generates unique reference number (RJ-2026-xxxx).
    
    Args:
        reject_request: CartRejectRequest with cart_id, rejecter_id, reason, and optional token
        
    Returns:
        Dictionary with reference, status, and rejected_at timestamp
    """
    try:
        token = reject_request.token
        if not token:
            raise HTTPException(status_code=401, detail="Authentication token is required.")
        
        company_id = get_company_id_from_token(token)
        user_id = int(reject_request.rejecter_id)
        first_name = get_user_first_name_from_token(token)
        
        if not first_name:
            jwt_data = decode_jwt_token(token)
            full_name = jwt_data.get("name") or jwt_data.get("userName") or jwt_data.get("fullName") or ""
            first_name = full_name.split()[0] if full_name else "User"
        
        reason = reject_request.reason or ""
        
        await approve_cart(
            token, company_id, int(reject_request.cart_id),
            user_id, first_name, "rejected", reason
        )
        
        reference = _generate_reference("RJ")
        rejected_at = datetime.now(timezone.utc).isoformat()
        
        log_action("cart_rejected_api", details={
            "cart_id": reject_request.cart_id,
            "rejecter_id": reject_request.rejecter_id,
            "reference": reference,
            "reason": reason,
        }, user_id=reject_request.rejecter_id)
        
        return {
            "reference": reference,
            "status": "rejected",
            "rejected_at": rejected_at,
        }
        
    except HTTPException:
        raise
    except Exception as e:
        log_error(
            "Unexpected error in api_reject_cart",
            details={"error": str(e), "cart_id": reject_request.cart_id},
            exc_info=True,
        )
        raise HTTPException(status_code=500, detail=f"Cart rejection failed: {str(e)}")
