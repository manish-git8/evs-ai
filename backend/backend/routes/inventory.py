"""
Inventory route handlers.

This module handles real-time inventory/stock check operations.
"""

from fastapi import APIRouter, Request

from models.schemas import InventoryCheckRequest
from services.inventory_service import check_inventory
from utils.audit_logger import log_action, log_error

# Create router for inventory endpoints
router = APIRouter()


@router.post("/api/inventory/check")
async def inventory_check(request: Request, check_request: InventoryCheckRequest):
    """
    Check real-time stock availability for a list of items.
    
    Queries live stock levels and suggests alternative SKUs from the
    same category when an item is unavailable.
    
    Args:
        check_request: InventoryCheckRequest with list of items (sku + qty)
        
    Returns:
        Dictionary with:
        - available: Boolean, True if all items have sufficient stock
        - unavailable_items: List of items with insufficient stock,
          each including sku, requested qty, available qty, and alternative_skus
    """
    try:
        items = [{"sku": item.sku, "qty": item.qty} for item in check_request.items]
        result = check_inventory(items)
        
        return result
        
    except Exception as e:
        log_error(
            "Inventory check failed",
            details={"error": str(e)},
            exc_info=True
        )
        return {
            "available": False,
            "unavailable_items": [],
            "error": f"Inventory check failed: {str(e)}"
        }
