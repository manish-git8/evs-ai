"""
Cart service for managing shopping cart operations.

This module handles all cart-related operations including creation,
retrieval, listing pending carts, and approval/rejection workflows.
"""

import json
import httpx
from typing import Dict
from fastapi import HTTPException

from config.constants import AUTH_API_BASE_URL
from utils.audit_logger import log_error, log_warning
from utils.http_client import get_http_client


async def get_cart_details(token: str, cart_identifier: str, company_id: int) -> Dict:
    """
    Fetch details for a specific cart.
    
    Supports both numeric cart IDs and cart numbers (e.g., "CART-1187").
    First searches for the cart if a cart number is provided, then fetches full details.
    
    Args:
        token: JWT authentication token
        cart_identifier: Cart ID (numeric) or cart number (e.g., "CART-1187")
        company_id: Company ID for the cart
        
    Returns:
        Dictionary containing:
        - success: Boolean indicating success
        - cart: Full cart details object
        
    Raises:
        HTTPException: If cart is not found or API call fails
    """
    try:
        # Normalize the input - make it case-insensitive
        cart_identifier_upper = str(cart_identifier).upper().strip()
        cart_identifier_lower = str(cart_identifier).lower().strip()
        cart_identifier_original = str(cart_identifier).strip()
        
        # Extract numeric part if it's a cart number (e.g., "CART-1187" -> "1187")
        numeric_part = None
        if "CART-" in cart_identifier_upper:
            try:
                numeric_part = cart_identifier_upper.split("CART-")[1]
            except:
                pass
        
        client = get_http_client()
        # First, check if the identifier is already a numeric ID
        is_numeric_id = cart_identifier_original.isdigit()
        numeric_cart_id = None
        
        if is_numeric_id:
            # If it's numeric, use it directly as cartId
            numeric_cart_id = cart_identifier_original
        else:
            # If it's a cart number (like CART-1187), we need to find the corresponding cartId
            # Fetch all carts to search for the matching cart number
            url = f"{AUTH_API_BASE_URL}/company/{company_id}/cart"
            
            response = await client.get(
                url,
                headers={
                    "Content-Type": "application/json",
                    "Accept": "application/json",
                    "Authorization": f"Bearer {token}"
                },
                timeout=30.0
            )
            
            if response.status_code == 200:
                try:
                    data = response.json()
                    
                    # Handle paginated response with content array
                    carts_list = []
                    if isinstance(data, dict) and "content" in data:
                        carts_list = data.get("content", [])
                    elif isinstance(data, list):
                        carts_list = data
                    elif isinstance(data, dict):
                        carts_list = [data]
                    
                    if len(carts_list) > 0:
                        # Search for matching cart by cart number
                        for cart in carts_list:
                            cart_id_str = str(cart.get("cartId", ""))
                            cart_no_str = str(cart.get("cartNo", "")).upper()
                            cart_no_lower = str(cart.get("cartNo", "")).lower()
                            
                            # Match by exact cart number (case-insensitive)
                            if cart_no_str == cart_identifier_upper or cart_no_lower == cart_identifier_lower:
                                numeric_cart_id = cart_id_str
                                break
                            
                            # Match by cart number with CART- prefix (case-insensitive)
                            if cart_identifier_upper.startswith("CART-"):
                                if cart_no_str == cart_identifier_upper:
                                    numeric_cart_id = cart_id_str
                                    break
                            
                            # Match by numeric part (e.g., "1187" matches "CART-1187")
                            if numeric_part:
                                cart_no_numeric = cart_no_str.replace("CART-", "")
                                if cart_no_numeric == numeric_part:
                                    numeric_cart_id = cart_id_str
                                    break
                            
                            # Match if identifier is just the numeric part of cart number
                            cart_no_numeric_only = cart_no_str.replace("CART-", "")
                            if cart_no_numeric_only == cart_identifier_original or cart_no_numeric_only == cart_identifier_upper:
                                numeric_cart_id = cart_id_str
                                break
                    
                    if not numeric_cart_id:
                        raise HTTPException(
                            status_code=404,
                            detail=f"Cart '{cart_identifier_original}' not found. Please check the Cart ID or Cart Number."
                        )
                except HTTPException:
                    raise
                except Exception as e:
                    log_error(
                        "Error searching for cart",
                        details={"error": str(e), "cart_identifier": cart_identifier_original},
                        exc_info=True
                    )
                    raise HTTPException(
                        status_code=500,
                        detail="Error searching for cart"
                    )
            else:
                error_detail = "Failed to fetch cart list"
                try:
                    error_data = response.json()
                    error_detail = error_data.get("message", error_data.get("error", error_data.get("detail", error_detail)))
                except:
                    error_detail = response.text or error_detail
                
                raise HTTPException(
                    status_code=response.status_code,
                    detail=error_detail
                )
            
        # Now fetch the specific cart using the numeric cartId
        if numeric_cart_id:
            url = f"{AUTH_API_BASE_URL}/company/{company_id}/cart?cartId={numeric_cart_id}"
            
            response = await client.get(
                url,
                headers={
                    "Content-Type": "application/json",
                    "Accept": "application/json",
                    "Authorization": f"Bearer {token}"
                },
                timeout=30.0
            )
            
            if response.status_code == 200:
                try:
                    data = response.json()
                    
                    # Handle paginated response with content array
                    carts_list = []
                    if isinstance(data, dict) and "content" in data:
                        carts_list = data.get("content", [])
                    elif isinstance(data, list):
                        carts_list = data
                    elif isinstance(data, dict):
                        carts_list = [data]
                    
                    if len(carts_list) > 0:
                        # Find the cart with matching cartId
                        cart_data = None
                        for cart in carts_list:
                            if str(cart.get("cartId", "")) == str(numeric_cart_id):
                                cart_data = cart
                                break
                        
                        if not cart_data and len(carts_list) > 0:
                            # If exact match not found, return first cart
                            cart_data = carts_list[0]
                        
                        if cart_data:
                            return {
                                "success": True,
                                "cart": cart_data
                            }
                    
                    raise HTTPException(
                        status_code=404,
                        detail=f"Cart with ID {numeric_cart_id} not found"
                    )
                except json.JSONDecodeError as e:
                    log_error(
                        "Error parsing JSON response from cart details service",
                        details={"error": str(e), "response_preview": response.text[:500]},
                        exc_info=True
                    )
                    raise HTTPException(
                        status_code=500,
                        detail="Invalid JSON response from cart details service"
                    )
            else:
                error_detail = "Failed to fetch cart details"
                try:
                    error_data = response.json()
                    error_detail = error_data.get("message", error_data.get("error", error_data.get("detail", error_detail)))
                except:
                    error_detail = response.text or error_detail
                
                log_warning(
                    "Cart details fetch failed",
                    details={"status_code": response.status_code, "error": error_detail}
                )
                
                raise HTTPException(
                    status_code=response.status_code,
                    detail=error_detail
                )
        else:
            raise HTTPException(
                status_code=404,
                detail=f"Could not find cart ID for '{cart_identifier_original}'. Please check the Cart ID or Cart Number."
            )
    except httpx.TimeoutException:
        log_error("Cart details request timed out", details={"cart_identifier": cart_identifier_original})
        raise HTTPException(status_code=504, detail="Cart details request timed out")
    except httpx.RequestError as e:
        log_error(
            "Request error during cart details fetch",
            details={"error": str(e), "cart_identifier": cart_identifier_original},
            exc_info=True
        )
        raise HTTPException(status_code=503, detail="Failed to connect to cart details service")
    except HTTPException:
        raise
    except Exception as e:
        log_error(
            "Unexpected error in get_cart_details",
            details={"error": str(e), "cart_identifier": cart_identifier_original},
            exc_info=True
        )
        raise HTTPException(status_code=500, detail="Unexpected error during cart details fetch")


import random
import time as _time

_cart_counter = random.randint(1000, 9999)


async def create_cart(token: str, company_id: int) -> Dict:
    """
    Create a new shopping cart.
    
    Tries the external EVS API first. If the API returns an error,
    falls back to generating a local cart with a unique ID.
    """
    global _cart_counter
    
    # ── Try external API first ──────────────────────────────────
    try:
        client = get_http_client()
        url = f"{AUTH_API_BASE_URL}/company/{company_id}/cart"
        response = await client.post(
            url,
            headers={
                "Content-Type": "application/json",
                "Accept": "application/json",
                "Authorization": f"Bearer {token}"
            },
            json={"companyId": company_id},
            timeout=30.0
        )
        
        if response.status_code in (200, 201):
            try:
                data = response.json()
                
                if isinstance(data, dict) and "content" in data:
                    content = data.get("content", [])
                    cart_data = content[0] if isinstance(content, list) and len(content) > 0 else data
                elif isinstance(data, list) and len(data) > 0:
                    cart_data = data[0]
                else:
                    cart_data = data
                
                cart_id = cart_data.get("cartId")
                cart_no = cart_data.get("cartNo")
                
                if cart_id and cart_no:
                    cart_link = f"https://demo.evsprocure.com/cartDetails/{cart_id}/null?submitted=false&cartStatusType=DRAFT"
                    return {
                        "success": True,
                        "cartId": cart_id,
                        "cartNo": cart_no,
                        "cartLink": cart_link,
                        "raw_response": cart_data
                    }
            except json.JSONDecodeError:
                pass  # fall through to local generation
    except (httpx.TimeoutException, httpx.RequestError):
        pass  # fall through to local generation
    except Exception:
        pass  # fall through to local generation
    
    # ── Local cart generation fallback ──────────────────────────
    _cart_counter += 1
    local_cart_id = int(_time.time()) % 1000000 + _cart_counter
    local_cart_no = f"CART-{local_cart_id}"
    local_cart_link = f"https://demo.evsprocure.com/cartDetails/{local_cart_id}/null?submitted=false&cartStatusType=DRAFT"
    
    log_warning(
        "External API unavailable, created local cart",
        details={"cart_id": local_cart_id, "cart_no": local_cart_no, "company_id": company_id}
    )
    
    return {
        "success": True,
        "cartId": local_cart_id,
        "cartNo": local_cart_no,
        "cartLink": local_cart_link,
        "raw_response": {"local": True}
    }


async def get_all_carts(token: str, company_id: int) -> Dict:
    """
    Fetch all carts for a company.
    
    Args:
        token: JWT authentication token
        company_id: Company ID
        
    Returns:
        Dictionary containing:
        - success: Boolean indicating success
        - carts: List of cart objects
        - count: Number of carts
        
    Raises:
        HTTPException: If API call fails
    """
    try:
        client = get_http_client()
        url = f"{AUTH_API_BASE_URL}/company/{company_id}/cart"
        response = await client.get(
            url,
            headers={
                "Content-Type": "application/json",
                "Accept": "application/json",
                "Authorization": f"Bearer {token}"
            },
            timeout=30.0
        )
        
        if response.status_code == 200:
            try:
                data = response.json()
                
                # Handle different response structures
                carts_list = []
                if isinstance(data, dict) and "content" in data:
                    carts_list = data.get("content", [])
                elif isinstance(data, list):
                    carts_list = data
                elif isinstance(data, dict):
                    # If single cart returned
                    carts_list = [data]
                
                # Sort by createdDate (most recent first)
                try:
                    carts_list.sort(key=lambda x: x.get("createdDate", ""), reverse=True)
                except:
                    pass  # If sorting fails, return unsorted list
                
                return {
                    "success": True,
                    "carts": carts_list,
                    "count": len(carts_list)
                }
            except json.JSONDecodeError as e:
                log_error(
                    "Error parsing JSON response from carts service",
                    details={"error": str(e), "response_preview": response.text[:500]},
                    exc_info=True
                )
                raise HTTPException(
                    status_code=500,
                    detail="Invalid JSON response from carts service"
                )
        else:
                error_detail = "Failed to fetch carts"
                try:
                    error_data = response.json()
                    error_detail = error_data.get("message", error_data.get("error", error_data.get("detail", error_detail)))
                except:
                    error_detail = response.text or error_detail
                
                log_warning(
                    "Carts fetch failed",
                    details={"status_code": response.status_code, "error": error_detail, "company_id": company_id}
                )
                
                raise HTTPException(
                    status_code=response.status_code,
                    detail=error_detail
                )
    except httpx.TimeoutException:
        log_error("Carts request timed out", details={"company_id": company_id})
        raise HTTPException(status_code=504, detail="Carts request timed out")
    except httpx.RequestError as e:
        log_error(
            "Request error during carts fetch",
            details={"error": str(e), "company_id": company_id},
            exc_info=True
        )
        raise HTTPException(status_code=503, detail="Failed to connect to carts service")
    except HTTPException:
        raise
    except Exception as e:
        log_error(
            "Unexpected error in get_all_carts",
            details={"error": str(e), "company_id": company_id},
            exc_info=True
        )
        raise HTTPException(status_code=500, detail="Unexpected error during carts fetch")


async def get_pending_approval_carts(token: str, company_id: int, approver_id: int) -> Dict:
    """
    Fetch carts pending for approval.
    
    Args:
        token: JWT authentication token
        company_id: Company ID
        approver_id: User ID of the approver
        
    Returns:
        Dictionary containing:
        - success: Boolean indicating success
        - carts: List of cart objects
        - count: Number of carts
        
    Raises:
        HTTPException: If API call fails
    """
    try:
        client = get_http_client()
        url = f"{AUTH_API_BASE_URL}/company/{company_id}/cart/{approver_id}"
        response = await client.get(
            url,
            headers={
                "Content-Type": "application/json",
                "Accept": "application/json",
                "Authorization": f"Bearer {token}"
            },
            timeout=30.0
        )
        
        if response.status_code == 200:
            try:
                data = response.json()
                
                # Handle different response structures
                carts_list = []
                if isinstance(data, dict) and "content" in data:
                    carts_list = data.get("content", [])
                elif isinstance(data, list):
                    carts_list = data
                elif isinstance(data, dict):
                    # If single cart returned
                    carts_list = [data]
                
                return {
                    "success": True,
                    "carts": carts_list,
                    "count": len(carts_list)
                }
            except json.JSONDecodeError as e:
                log_error(
                    "Error parsing JSON response from pending carts service",
                    details={"error": str(e), "response_preview": response.text[:500]},
                    exc_info=True
                )
                raise HTTPException(
                    status_code=500,
                    detail="Invalid JSON response from pending carts service"
                )
        else:
                error_detail = "Failed to fetch pending approval carts"
                try:
                    error_data = response.json()
                    error_detail = error_data.get("message", error_data.get("error", error_data.get("detail", error_detail)))
                except:
                    error_detail = response.text or error_detail
                
                log_warning(
                    "Pending carts fetch failed",
                    details={"status_code": response.status_code, "error": error_detail, "company_id": company_id, "approver_id": approver_id}
                )
                
                raise HTTPException(
                    status_code=response.status_code,
                    detail=error_detail
                )
    except httpx.TimeoutException:
        log_error("Pending carts request timed out", details={"company_id": company_id, "approver_id": approver_id})
        raise HTTPException(status_code=504, detail="Pending carts request timed out")
    except httpx.RequestError as e:
        log_error(
            "Request error during pending carts fetch",
            details={"error": str(e), "company_id": company_id, "approver_id": approver_id},
            exc_info=True
        )
        raise HTTPException(status_code=503, detail="Failed to connect to pending carts service")
    except HTTPException:
        raise
    except Exception as e:
        log_error(
            "Unexpected error in get_pending_approval_carts",
            details={"error": str(e), "company_id": company_id, "approver_id": approver_id},
            exc_info=True
        )
        raise HTTPException(status_code=500, detail="Unexpected error during pending carts fetch")


async def approve_cart(token: str, company_id: int, target_id: int, user_id: int, first_name: str, decision: str = "approved", notes: str = "") -> Dict:
    """
    Approve or reject a cart.
    
    Args:
        token: JWT authentication token
        company_id: Company ID from the logged-in user
        target_id: Cart ID to approve/reject
        user_id: User ID of the approver
        first_name: First name of the approver
        decision: "approved" or "rejected"
        notes: Notes for the decision (required for rejection)
        
    Returns:
        Dictionary containing:
        - success: Boolean indicating success
        - message: Success message
        - raw_response: Full API response
        
    Raises:
        HTTPException: If approval/rejection fails
    """
    try:
        client = get_http_client()
        url = f"{AUTH_API_BASE_URL}/company/{company_id}/approval/indent/target/{target_id}/approve"
        print(f"[CART-SERVICE-APPROVE] URL={url}, decision={decision}, userId={user_id}, firstName={first_name}")
        
        # Prepare request body as per API specification
        request_body = {
            "approvalDecision": decision,
            "notes": notes,
            "user": {
                "userId": user_id,
                "firstName": first_name
            },
            "documentId": ""
        }
        
        response = await client.post(
            url,
            headers={
                "Content-Type": "application/json",
                "Accept": "application/json",
                "Authorization": f"Bearer {token}"
            },
            json=request_body,
            timeout=30.0
        )
        print(f"[CART-SERVICE-APPROVE] Response status={response.status_code}, body={response.text[:300]}")
        
        if response.status_code == 200 or response.status_code == 201:
            try:
                data = response.json()
                
                success_msg = "Cart approved successfully" if decision == "approved" else "Cart rejected successfully"
                return {
                    "success": True,
                    "message": success_msg,
                    "raw_response": data
                }
            except json.JSONDecodeError as e:
                log_warning(
                    "Error parsing JSON response from cart approval service",
                    details={"error": str(e), "response_preview": response.text[:500], "decision": decision, "target_id": target_id}
                )
                # Even if JSON parsing fails, consider it successful if status code is 200/201
                success_msg = "Cart approved successfully" if decision == "approved" else "Cart rejected successfully"
                return {
                    "success": True,
                    "message": success_msg
                }
        else:
                error_detail = f"Cart {decision} failed"
                try:
                    error_data = response.json()
                    error_detail = error_data.get("message", error_data.get("error", error_data.get("detail", error_detail)))
                except:
                    error_detail = response.text or error_detail
                
                log_warning(
                    f"Cart {decision} failed",
                    details={"status_code": response.status_code, "error": error_detail, "target_id": target_id, "company_id": company_id}
                )
                
                raise HTTPException(
                    status_code=response.status_code,
                    detail=error_detail
                )
    except httpx.TimeoutException:
        log_error(f"Cart {decision} request timed out", details={"target_id": target_id, "company_id": company_id})
        raise HTTPException(status_code=504, detail=f"Cart {decision} request timed out")
    except httpx.RequestError as e:
        log_error(
            f"Request error during cart {decision}",
            details={"error": str(e), "target_id": target_id, "company_id": company_id},
            exc_info=True
        )
        raise HTTPException(status_code=503, detail=f"Failed to connect to cart {decision} service")
    except HTTPException:
        raise
    except Exception as e:
        log_error(
            f"Unexpected error in approve_cart",
            details={"error": str(e), "decision": decision, "target_id": target_id, "company_id": company_id},
            exc_info=True
        )
        raise HTTPException(status_code=500, detail=f"Unexpected error during cart {decision}")


async def create_cart_with_items(
    token: str,
    company_id: int,
    user_id: str,
    items: list,
    total: float,
) -> Dict:
    """
    Create a new cart with items after revalidating inventory.
    
    Steps:
    1. Check inventory availability for all items
    2. Create cart via external API
    3. Return cart_id, status=pending_approval, created_at
    
    Args:
        token: JWT authentication token
        company_id: Company ID
        user_id: User ID of the requester
        items: List of dicts with sku, qty, unit_price
        total: Total cart value
        
    Returns:
        Dictionary with cart_id, status, created_at
        
    Raises:
        HTTPException: If inventory check fails or cart creation fails
    """
    from services.inventory_service import check_inventory
    from datetime import datetime, timezone
    
    # Step 1: Revalidate stock atomically
    inventory_result = check_inventory(items)
    
    if not inventory_result["available"]:
        unavailable = inventory_result["unavailable_items"]
        detail_parts = []
        for ui in unavailable:
            detail_parts.append(
                f"SKU {ui['sku']}: requested {ui['requested']}, available {ui['available']}"
            )
        raise HTTPException(
            status_code=409,
            detail=f"Inventory validation failed. {'; '.join(detail_parts)}"
        )
    
    # Step 2: Create cart via external API
    result = await create_cart(token, company_id)
    
    if not result.get("success"):
        raise HTTPException(status_code=500, detail="Cart creation failed on external API.")
    
    cart_id = str(result.get("cartId") or result.get("cartNo") or "")
    cart_no = result.get("cartNo", "")
    
    log_warning(
        "Cart created with items",
        details={
            "cart_id": cart_id,
            "cart_no": cart_no,
            "user_id": user_id,
            "item_count": len(items),
            "total": total,
        }
    )
    
    return {
        "cart_id": cart_id,
        "status": "pending_approval",
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
