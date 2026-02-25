"""
Inventory service — fetches items from the live Internal Catalog API.

Falls back to MOCK_CATALOG when the API is unreachable (e.g. offline dev).
The live catalog is cached for 5 minutes to avoid excessive API calls.
"""

import time
import logging
import httpx
from typing import Dict, List, Optional

from config.constants import AUTH_API_BASE_URL
from utils.audit_logger import log_action, log_warning, log_error

logger = logging.getLogger(__name__)


# ═══════════════════════════════════════════════════════
# MOCK INVENTORY CATALOG  (offline fallback only)
# ═══════════════════════════════════════════════════════
MOCK_CATALOG: Dict[str, Dict] = {
    "SKU-001": {"stock": 150, "category": "office_supplies", "description": "A4 Copy Paper (500 sheets)", "unit_price": 8.50},
    "SKU-002": {"stock": 75,  "category": "office_supplies", "description": "A3 Copy Paper (500 sheets)", "unit_price": 12.00},
    "SKU-004": {"stock": 200, "category": "office_supplies", "description": "Sticky Notes Assorted (24-pack)", "unit_price": 9.99},
    "SKU-005": {"stock": 30,  "category": "office_supplies", "description": "Ballpoint Pens Blue (50-pack)", "unit_price": 11.50},
    "SKU-010": {"stock": 45,  "category": "it_equipment", "description": "USB-C Hub 7-Port", "unit_price": 39.99},
    "SKU-012": {"stock": 20,  "category": "it_equipment", "description": "Wired Mouse Standard", "unit_price": 14.99},
    "SKU-013": {"stock": 10,  "category": "it_equipment", "description": "Mechanical Keyboard TKL", "unit_price": 79.99},
    "SKU-014": {"stock": 5,   "category": "it_equipment", "description": "Webcam 1080p", "unit_price": 49.99},
    "SKU-020": {"stock": 100, "category": "cleaning", "description": "Hand Sanitizer 500ml", "unit_price": 4.99},
    "SKU-021": {"stock": 60,  "category": "cleaning", "description": "Disinfectant Wipes (100ct)", "unit_price": 6.99},
    "SKU-023": {"stock": 80,  "category": "cleaning", "description": "All-Purpose Cleaner 1L", "unit_price": 7.50},
    "SKU-030": {"stock": 25,  "category": "furniture", "description": "Ergonomic Office Chair", "unit_price": 299.99},
    "SKU-032": {"stock": 15,  "category": "furniture", "description": "Monitor Arm Single", "unit_price": 89.99},
    "SKU-033": {"stock": 8,   "category": "furniture", "description": "Under-Desk Cable Tray", "unit_price": 34.99},
    "SKU-040": {"stock": 500, "category": "safety", "description": "Nitrile Gloves Box (100ct)", "unit_price": 12.99},
    "SKU-041": {"stock": 200, "category": "safety", "description": "Safety Goggles", "unit_price": 8.99},
    "SKU-043": {"stock": 150, "category": "safety", "description": "Hi-Vis Vest Orange", "unit_price": 11.50},
}

KEYWORD_MAP: Dict[str, str] = {
    "paper": "SKU-001", "a4 paper": "SKU-001", "copy paper": "SKU-001",
    "a3 paper": "SKU-002",
    "sticky note": "SKU-004", "post-it": "SKU-004", "sticky": "SKU-004",
    "pen": "SKU-005", "ballpoint": "SKU-005",
    "usb hub": "SKU-010", "hub": "SKU-010", "usb-c hub": "SKU-010",
    "mouse": "SKU-012", "wired mouse": "SKU-012",
    "keyboard": "SKU-013", "mechanical keyboard": "SKU-013",
    "webcam": "SKU-014", "camera": "SKU-014",
    "sanitizer": "SKU-020", "hand sanitizer": "SKU-020",
    "wipe": "SKU-021", "disinfectant": "SKU-021", "disinfectant wipe": "SKU-021",
    "cleaner": "SKU-023", "all-purpose cleaner": "SKU-023",
    "chair": "SKU-030", "office chair": "SKU-030", "ergonomic chair": "SKU-030",
    "monitor arm": "SKU-032", "arm": "SKU-032",
    "cable tray": "SKU-033",
    "glove": "SKU-040", "nitrile glove": "SKU-040",
    "goggle": "SKU-041", "safety goggle": "SKU-041",
    "vest": "SKU-043", "hi-vis vest": "SKU-043", "safety vest": "SKU-043",
    "laptop": "SKU-013",
}


# ═══════════════════════════════════════════════════════
# PRICE EXTRACTION HELPER
# ═══════════════════════════════════════════════════════
_PRICE_FIELD_NAMES = [
    "UnitPrice", "unitPrice", "Unit_Price", "unit_price",
    "Price", "price",
    "Cost", "cost", "unitCost", "UnitCost", "unit_cost",
    "ListPrice", "listPrice", "list_price",
    "StandardPrice", "standardPrice", "standard_price",
    "ExtendedPrice", "extendedPrice",
    "Amount", "amount",
    "Rate", "rate",
]

# Fields that look numeric but are NOT prices
_NON_PRICE_FIELDS = {
    "partid", "catalogid", "catalogitemid", "supplierid", "companyid",
    "productid", "departmentid", "locationid", "classid", "glaccountid",
    "userid", "id", "qty", "quantity", "qtyperunit", "qtyperuom",
    "minimumorderqty", "maximumorderqty", "leadtimedays", "leadtime",
    "ordertype", "sortorder", "pagesize", "pagenumber",
    "version", "status", "active", "isactive",
}

def _extract_price(item: dict) -> float:
    """Extract price from an API item dict.
    1. Try all known price field names.
    2. Fallback: scan all numeric values and pick the first one that isn't an ID field.
    """
    # Pass 1: named fields
    for field in _PRICE_FIELD_NAMES:
        val = item.get(field)
        if val is not None:
            try:
                price = float(val)
                if price > 0:
                    return price
            except (ValueError, TypeError):
                # Could be a nested object like {"amount": 10.0, "currency": "USD"}
                if isinstance(val, dict):
                    for subkey in ("amount", "value", "price", "unitPrice"):
                        subval = val.get(subkey)
                        if subval is not None:
                            try:
                                price = float(subval)
                                if price > 0:
                                    return price
                            except (ValueError, TypeError):
                                pass

    # Pass 2: scan all top-level numeric values as fallback
    for key, val in item.items():
        if key.lower() in _NON_PRICE_FIELDS:
            continue
        if val is not None:
            try:
                price = float(val)
                # Heuristic: prices are typically 0.01–999999; skip big IDs
                if 0.01 <= price <= 999999 and not key.lower().endswith("id"):
                    logger.info(f"[Price Fallback] Found price {price} in field '{key}'")
                    return price
            except (ValueError, TypeError):
                pass

    return 0.0


# ═══════════════════════════════════════════════════════
# LIVE CATALOG CACHE
# ═══════════════════════════════════════════════════════
_live_catalog_cache: Dict[str, Dict] = {}   # part_id → item dict
_live_keyword_map: Dict[str, str] = {}       # keyword → part_id
_cache_timestamp: float = 0
_CACHE_TTL = 60  # 1 minute — shorter TTL to pick up price changes quickly


async def fetch_internal_catalog(token: str, company_id: int) -> Dict[str, Dict]:
    """
    Fetch both INTERNAL items (company specific) and GLOBAL catalog items.
    Results are merged to ensure we have correct pricing metadata.
    Results are cached for 5 minutes.

    Returns dict mapping PartId → {description, unit_price, stock, category, raw_item}
    """
    global _live_catalog_cache, _live_keyword_map, _cache_timestamp

    # Return cache if fresh
    if _live_catalog_cache and (time.time() - _cache_timestamp) < _CACHE_TTL:
        return _live_catalog_cache

    headers = {
        "Content-Type": "application/json",
        "Accept": "application/json",
        "Authorization": f"Bearer {token}",
    }

    catalog = {}
    kw_map = {}

    # 1. Fetch Global Catalog Items (for Pricing/Metadata)
    try:
        global_url = f"{AUTH_API_BASE_URL}/catalogItem"
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(global_url, headers=headers, params={"pageSize": 1000})
            if resp.status_code == 200:
                data = resp.json()
                items = data.get("content") or data if isinstance(data, (dict, list)) else []
                if isinstance(items, dict):
                    items = [items]
                # Log first 3 items for debugging
                for i, item in enumerate(items[:3]):
                    logger.info(f"[Catalog DEBUG] Global item {i}: keys={list(item.keys())}, sample_values={{ k: item[k] for k in list(item.keys())[:15] }}")
                for item in items:
                    pid = str(item.get("PartId") or item.get("partId") or item.get("partNumber") or item.get("PartNumber") or item.get("itemId") or item.get("ItemId") or "").strip()
                    if not pid: continue
                    price = _extract_price(item)
                    desc = str(item.get("Description") or item.get("description") or item.get("PartDescription") or item.get("partDescription") or item.get("itemName") or item.get("ItemName") or item.get("productName") or item.get("ProductName") or pid)
                    logger.info(f"[Catalog] Global: pid={pid}, desc={desc[:40]}, price={price}")
                    catalog[pid] = {
                        "description": desc,
                        "unit_price": price,
                        "stock": 999, # Global items assumed available unless otherwise stated
                        "category": str(item.get("category") or item.get("Category") or item.get("categoryName") or item.get("CategoryName") or "General").lower(),
                        "uom": str(item.get("UnitOfMeasure") or item.get("unitOfMeasure") or item.get("uom") or item.get("Uom") or "Piece"),
                        "raw_item": item
                    }
    except Exception as e:
        logger.warning(f"Failed to fetch global catalog: {e}")

    # 2. Fetch Company-Specific Internal Items (for local stock/IDs)
    try:
        url = f"{AUTH_API_BASE_URL}/company/{company_id}/internal-items"
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(url, headers=headers, params={"status": "ACTIVE", "pageSize": 1000})
            if resp.status_code == 200:
                data = resp.json()
                items_list = data.get("content") or data if isinstance(data, (dict, list)) else []
                if isinstance(items_list, dict):
                    items_list = [items_list]
                # Log first 3 internal items for debugging
                for i, item in enumerate(items_list[:3]):
                    logger.info(f"[Catalog DEBUG] Internal item {i}: keys={list(item.keys())}, sample_values={{ k: item[k] for k in list(item.keys())[:15] }}")
                for item in items_list:
                    part_id = str(item.get("partId") or item.get("PartId") or item.get("partNumber") or item.get("PartNumber") or item.get("itemId") or item.get("ItemId") or "").strip()
                    if not part_id: continue

                    unit_price = _extract_price(item)
                    desc = str(item.get("description") or item.get("Description") or item.get("partDescription") or item.get("PartDescription") or item.get("itemName") or item.get("ItemName") or part_id)
                    logger.info(f"[Catalog] Internal: pid={part_id}, desc={desc[:40]}, price={unit_price}")

                    # If global item exists and has 0 price but internal item has price, use internal
                    if part_id in catalog and catalog[part_id]["unit_price"] == 0 and unit_price > 0:
                        catalog[part_id]["unit_price"] = unit_price
                    # If internal has a non-zero price, always prefer it (more specific)
                    elif part_id in catalog and unit_price > 0:
                        catalog[part_id]["unit_price"] = unit_price
                    
                    if part_id not in catalog:
                        catalog[part_id] = {
                            "description": desc,
                            "unit_price": unit_price,
                            "stock": int(item.get("qtyPerUnit") or item.get("QtyPerUnit") or item.get("stockQty") or item.get("StockQty") or 999),
                            "category": str(item.get("categoryName") or item.get("Category") or item.get("category") or "General").lower(),
                            "uom": str(item.get("defaultUom") or item.get("UnitOfMeasure") or item.get("unitOfMeasure") or item.get("uom") or "Piece"),
                            "raw_item": item,
                        }
    except Exception as e:
        logger.warning(f"Failed to fetch internal items: {e}")

    # Build keyword map from merged catalog
    for pid, info in catalog.items():
        desc_lower = info["description"].lower()
        words = desc_lower.split()
        for word in words:
            word = word.strip("(),.-")
            if len(word) > 2 and word not in ("the", "and", "for", "with"):
                kw_map[word] = pid
        kw_map[desc_lower] = pid
        kw_map[pid.lower()] = pid

    _live_catalog_cache = catalog
    _live_keyword_map = kw_map
    _cache_timestamp = time.time()
    return catalog


def _get_active_catalog() -> Dict[str, Dict]:
    """Return the live catalog if available, else the mock catalog."""
    if _live_catalog_cache:
        return _live_catalog_cache
    return MOCK_CATALOG


def _get_active_keyword_map() -> Dict[str, str]:
    """Return the live keyword map if available, else the mock keyword map."""
    if _live_keyword_map:
        return _live_keyword_map
    return KEYWORD_MAP


# ═══════════════════════════════════════════════════════
# PUBLIC API  (same signatures as before)
# ═══════════════════════════════════════════════════════

def _get_alternatives(sku: str, exclude_sku: str = None) -> List[str]:
    """Find alternative items from the same category."""
    catalog = _get_active_catalog()
    item = catalog.get(sku)
    if not item:
        return []

    category = item["category"]
    alternatives = []
    for alt_sku, alt_data in catalog.items():
        if alt_sku == (exclude_sku or sku):
            continue
        if alt_data["category"] == category and alt_data.get("stock", 0) > 0:
            alternatives.append(alt_sku)
        if len(alternatives) >= 3:
            break
    return alternatives


def fuzzy_match_sku(item_name: str) -> Optional[str]:
    """
    Map a natural-language item name to a catalog PartId/SKU.
    Returns the PartId string or None if no match.
    """
    catalog = _get_active_catalog()
    kw_map = _get_active_keyword_map()
    name = item_name.lower().strip().rstrip("s")  # strip plural

    # 1. Direct keyword lookup
    if name in kw_map:
        return kw_map[name]

    # 2. Check if input is already a valid part ID / SKU
    upper = item_name.upper().strip()
    if upper in catalog:
        return upper
    original = item_name.strip()
    if original in catalog:
        return original

    # 3. Substring match against descriptions
    for sku, data in catalog.items():
        desc_lower = data["description"].lower()
        if name in desc_lower:
            return sku

    # 4. Word-level match (match if all words in input appear in description)
    name_words = set(name.split())
    if len(name_words) >= 2:
        for sku, data in catalog.items():
            desc_words = set(data["description"].lower().split())
            if name_words.issubset(desc_words):
                return sku

    return None


def get_product_info(sku: str) -> Optional[Dict]:
    """Return full product info dict for a SKU/PartId."""
    catalog = _get_active_catalog()
    entry = catalog.get(sku)
    if entry is None:
        return None
    return {"sku": sku, **entry}


def check_inventory(items: List[Dict]) -> Dict:
    """Check inventory availability for a list of items."""
    catalog = _get_active_catalog()
    unavailable_items = []
    all_available = True

    for item in items:
        sku = item["sku"]
        requested_qty = item["qty"]
        catalog_entry = catalog.get(sku)

        if catalog_entry is None:
            unavailable_items.append({
                "sku": sku, "requested": requested_qty,
                "available": 0, "alternative_skus": []
            })
            all_available = False
        elif catalog_entry.get("stock", 0) < requested_qty:
            unavailable_items.append({
                "sku": sku, "requested": requested_qty,
                "available": catalog_entry["stock"],
                "alternative_skus": _get_alternatives(sku)
            })
            all_available = False

    log_action("inventory_check", details={
        "items_checked": len(items),
        "all_available": all_available,
        "unavailable_count": len(unavailable_items)
    })

    return {"available": all_available, "unavailable_items": unavailable_items}


def get_sku_details(sku: str) -> Optional[Dict]:
    """Get details for a single SKU/PartId."""
    return _get_active_catalog().get(sku)


def get_available_items_list() -> Dict[str, list]:
    """Return in-stock items grouped by category for display during cart creation."""
    catalog = _get_active_catalog()
    categories: Dict[str, list] = {}
    for sku, data in catalog.items():
        if data.get("stock", 0) > 0:
            cat = data["category"].replace("_", " ").replace("and", "&").title()
            categories.setdefault(cat, []).append({
                "sku": sku,
                "description": data["description"],
                "unit_price": data["unit_price"],
                "stock": data.get("stock", 0),
            })
    return categories


def get_available_items_voice_summary() -> str:
    """Return a short voice-friendly summary of available item categories."""
    cats = get_available_items_list()
    parts = []
    for cat, items in cats.items():
        names = [it["description"].split("(")[0].strip() for it in items[:3]]
        parts.append(f"{cat}: {', '.join(names)}")
    return ". ".join(parts)


def get_available_items_text() -> str:
    """Return a formatted markdown text of all available items for chat display."""
    cats = get_available_items_list()
    lines = ["**Available Items:**\n"]
    for cat, items in cats.items():
        lines.append(f"**{cat}**")
        for it in items:
            price_str = f" (${it['unit_price']:.2f})" if it['unit_price'] > 0 else ""
            stock_str = f" — {it['stock']} in stock" if it['stock'] < 999 else ""
            lines.append(f"- {it['description']}{price_str}{stock_str}")
    return "\n".join(lines)
