"""
Intent parser for the chatbot.

Extracts structured intent from natural language text:
  - action:   navigate / approve / reject / status / search / page / confirm / deny / back / help
  - entity:   cart / po / rfq
  - id:       optional entity identifier (e.g. "1414", "PO-123")
  - page:     optional page number
  - search:   optional search query
"""

import re
from difflib import SequenceMatcher

# ─────────────────────────────────────────────────────────
# Intent patterns — order matters (first match wins)
# ─────────────────────────────────────────────────────────

# Common typos for "status" — reusable across patterns
_S = r"(?:status|stauts|staus|sttaus|satuts|statu|statuz|statis)"
INTENT_RULES = [
    # Confirmation / denial (highest priority during confirmation flows)
    (r"\b(yes|confirm|go ahead|do it|proceed|approve it|reject it|sure|ok)\b", "confirm", None),
    (r"\b(no|cancel|never mind|stop|don'?t)\b", "deny", None),

    # Navigation — back / main menu / help
    (r"\b(back|go back|main menu|home|start over)\b", "back", None),
    (r"\b(help|what can you do|commands|options|help me|need help|assist me|assistance)\b", "help", None),

    # Clear search / reset filter
    (r"\b(?:clear|reset)\s*(?:search|filter)?\b", "clear_search", None),

    # Page navigation
    (r"\b(?:page|pg)\s*(\d+)\b", "page", None),
    (r"\b(next page|next|show more)\b", "page_next", None),
    (r"\b(previous page|prev|go back a page)\b", "page_prev", None),

    # Search
    (r"\bsearch\s+(.+)", "search", None),

    # ── SINGLE-ITEM LOOKUP: entity + status/detail + ID (MUST come before generic status) ──
    (r"\b(?:cart|card|crt|kart|art)\s+(?:status|details?|info)\s*#?\s*(\d[\w-]*)\b", "view_detail", "cart"),
    (r"\b(?:status|details?|info)\s+(?:of\s+)?(?:cart|card|crt|kart|art)\s*#?\s*(\d[\w-]*)\b", "view_detail", "cart"),
    (r"\b(?:po|purchase\s*order)\s+(?:status|details?|info)\s*#?\s*(\d[\w-]*)\b", "view_detail", "po"),
    (r"\b(?:status|details?|info)\s+(?:of\s+)?(?:po|purchase\s*order)\s*#?\s*(\d[\w-]*)\b", "view_detail", "po"),
    (r"\b(?:rfq|quotation|quote)\s+(?:status|details?|info)\s*#?\s*(\d[\w-]*)\b", "view_detail", "rfq"),
    (r"\b(?:status|details?|info)\s+(?:of\s+)?(?:rfq|quotation|quote)\s*#?\s*(\d[\w-]*)\b", "view_detail", "rfq"),
    # Also match plain "status 1464" or "details 1464" (uses session context)
    (r"\b(?:status|details?|info)\s+#?\s*(\d{3,})\b", "view_detail", None),

    # ── MIXED-ENTITY APPROVE/REJECT: when rfq/po appears with approve/reject + optional "cart" ──
    # "approve rfq cart" / "rfq approve cart" / "approve rfq cart 12" → entity = rfq
    # "approve po cart" / "po approve cart" / "reject po cart 1603" → entity = po
    # These MUST come before compound phrases and cart action rules so the primary entity wins.

    # RFQ + approve/reject (any word order, with optional "cart" noise and optional numeric ID)
    (r"\b(?:approve|accept|authorize)\s+(?:rfq|r\.?f\.?q|quotation|quote)\s*(?:cart|card|indent|requisition)?\s*#?\s*(\d[\w-]*)\b", "approve", "rfq"),
    (r"\b(?:reject|decline|deny)\s+(?:rfq|r\.?f\.?q|quotation|quote)\s*(?:cart|card|indent|requisition)?\s*#?\s*(\d[\w-]*)\b", "reject", "rfq"),
    (r"\b(?:rfq|r\.?f\.?q|quotation|quote)\s+(?:approve|accept|authorize)\s*(?:cart|card|indent|requisition)?\s*#?\s*(\d[\w-]*)\b", "approve", "rfq"),
    (r"\b(?:rfq|r\.?f\.?q|quotation|quote)\s+(?:reject|decline|deny)\s*(?:cart|card|indent|requisition)?\s*#?\s*(\d[\w-]*)\b", "reject", "rfq"),
    # Without ID (menu variants)
    (r"\b(?:approve|accept|authorize)\s+(?:rfq|r\.?f\.?q|quotation|quote)\s*(?:cart|card|indent|requisition)?\s*$", "approve_menu", "rfq"),
    (r"\b(?:reject|decline|deny)\s+(?:rfq|r\.?f\.?q|quotation|quote)\s*(?:cart|card|indent|requisition)?\s*$", "reject_menu", "rfq"),
    (r"\b(?:rfq|r\.?f\.?q|quotation|quote)\s+(?:approve|accept|authorize)\s*(?:cart|card|indent|requisition)?\s*$", "approve_menu", "rfq"),
    (r"\b(?:rfq|r\.?f\.?q|quotation|quote)\s+(?:reject|decline|deny)\s*(?:cart|card|indent|requisition)?\s*$", "reject_menu", "rfq"),

    # PO + approve/reject (any word order, with optional "cart" noise and optional numeric ID)
    (r"\b(?:approve|accept|authorize)\s+(?:po|p\.?o|purchase\s*order)\s*(?:cart|card|indent|requisition)?\s*#?\s*(\d[\w-]*)\b", "approve", "po"),
    (r"\b(?:reject|decline|deny)\s+(?:po|p\.?o|purchase\s*order)\s*(?:cart|card|indent|requisition)?\s*#?\s*(\d[\w-]*)\b", "reject", "po"),
    (r"\b(?:po|p\.?o|purchase\s*order)\s+(?:approve|accept|authorize)\s*(?:cart|card|indent|requisition)?\s*#?\s*(\d[\w-]*)\b", "approve", "po"),
    (r"\b(?:po|p\.?o|purchase\s*order)\s+(?:reject|decline|deny)\s*(?:cart|card|indent|requisition)?\s*#?\s*(\d[\w-]*)\b", "reject", "po"),
    # Without ID (menu variants)
    (r"\b(?:approve|accept|authorize)\s+(?:po|p\.?o|purchase\s*order)\s*(?:cart|card|indent|requisition)?\s*$", "approve_menu", "po"),
    (r"\b(?:reject|decline|deny)\s+(?:po|p\.?o|purchase\s*order)\s*(?:cart|card|indent|requisition)?\s*$", "reject_menu", "po"),
    (r"\b(?:po|p\.?o|purchase\s*order)\s+(?:approve|accept|authorize)\s*(?:cart|card|indent|requisition)?\s*$", "approve_menu", "po"),
    (r"\b(?:po|p\.?o|purchase\s*order)\s+(?:reject|decline|deny)\s*(?:cart|card|indent|requisition)?\s*$", "reject_menu", "po"),

    # ── COMPOUND PHRASES: "RFQ cart status" / "PO cart status" → entity is RFQ/PO, NOT cart ──
    (r"\b(?:approve|accept|authorize)\s+(?:cart|card|crt|kart|caart|art|indent|requisition|basket|shopping\s*cart|procurement\s*cart)\s*#?\s*(\w[\w-]*)\b", "approve", "cart"),
    (r"\b(?:reject|decline|deny)\s+(?:cart|card|crt|kart|caart|art|indent|requisition|basket|shopping\s*cart|procurement\s*cart)\s*#?\s*(\w[\w-]*)\b", "reject", "cart"),
    (r"\b(?:approve|accept)\s+(?:cart|card|crt|kart|caart|art|indent|requisition|basket)\b", "approve_menu", "cart"),
    (r"\b(?:reject|decline|deny)\s+(?:cart|card|crt|kart|caart|art|indent|requisition|basket)\b", "reject_menu", "cart"),
    (r"\b(?:cart|card|crt|kart|caart|art|indent|requisition|basket)\s+(?:" + _S + r"|details?|info|list|view|tracking|summary)\b", "status", "cart"),
    (r"\b(?:" + _S + r"|details?|info|tracking|summary)\s+(?:of\s+)?(?:cart|card|crt|kart|caart|indent|requisition|basket)\b", "status", "cart"),
    (r"\b(?:show|view|check|list|my|see|open|manage)\s+(?:all\s+)?(?:cart|card|crt|kart|caart|indent|requisition|basket|shopping\s*cart)s?\b", "status", "cart"),
    # ── UNSUPPORTED actions — catch these BEFORE generic navigate so they don't show submenus ──
    (r"\b(?:create|make|new|generate|build|setup|set\s*up)\s+(?:a\s+)?(?:new\s+)?(?:cart|card|crt|kart|art|indent|requisition|basket|shopping\s*cart|procurement\s*cart)\b", "unsupported", "cart"),
    (r"\b(?:cart|card|crt|kart|art|indent|requisition|basket)\s+(?:create|make|new|generate|build|setup)\b", "unsupported", "cart"),
    (r"\b(?:edit|modify|change|alter|update)\s+(?:a\s+)?(?:cart|card|crt|kart|art|indent|requisition|basket)\b", "unsupported", "cart"),
    (r"\b(?:cart|card|crt|kart|art|indent|requisition|basket)\s+(?:edit|modify|change|alter|update)\b", "unsupported", "cart"),
    (r"\b(?:delete|remove|cancel|discard|destroy)\s+(?:a\s+)?(?:cart|card|crt|kart|art|indent|requisition|basket)\b", "unsupported", "cart"),
    (r"\b(?:cart|card|crt|kart|art|indent|requisition|basket)\s+(?:delete|remove|cancel|discard|destroy)\b", "unsupported", "cart"),
    (r"\b(?:add|put|place)\s+(?:items?\s+)?(?:to|in|into)\s+(?:cart|card|crt|kart|art|indent|basket)\b", "unsupported", "cart"),

    (r"\b(?:create|make|new|generate|edit|modify|delete|remove|cancel|update|add)\s+(?:a\s+)?(?:new\s+)?(?:po|purchase\s*order)\b", "unsupported", "po"),
    (r"\b(?:po|purchase\s*order)\s+(?:create|make|new|generate|edit|modify|delete|remove|cancel|update|add)\b", "unsupported", "po"),

    (r"\b(?:create|make|new|generate|edit|modify|delete|remove|cancel|update|add)\s+(?:a\s+)?(?:new\s+)?(?:rfq|quotation|quote|request\s*for\s*quot(?:e|ation))\b", "unsupported", "rfq"),
    (r"\b(?:rfq|quotation|quote)\s+(?:create|make|new|generate|edit|modify|delete|remove|cancel|update|add)\b", "unsupported", "rfq"),

    (r"\b(?:cart|card|crt|kart|caart|caat|cartt|cardt)s?\b", "navigate", "cart"),
    (r"\bshopping\s*(?:cart|bag)\b", "navigate", "cart"),
    (r"\bprocurement\s*(?:cart|basket)\b", "navigate", "cart"),
    (r"\bmy\s*(?:basket|items|cart)\b", "navigate", "cart"),

    # ── PO actions (with fuzzy typo support) ──
    (r"\b(?:approve|accept)\s+(?:po|p\.?o|p\s*o|purchase\s*order|purchse\s*order|purcase\s*order|puchase\s*order|procurement\s*order|buying\s*order|vendor\s*order|supplier\s*order)\s*#?\s*(\w[\w-]*)", "approve", "po"),
    (r"\b(?:reject|decline|deny)\s+(?:po|p\.?o|p\s*o|purchase\s*order|purchse\s*order|purcase\s*order|puchase\s*order|procurement\s*order|buying\s*order|vendor\s*order|supplier\s*order)\s*#?\s*(\w[\w-]*)", "reject", "po"),
    (r"\b(?:approve|accept)\s+(?:po|p\.?o|p\s*o|purchase\s*order|purchse\s*order|procurement\s*order|buying\s*order|vendor\s*order)\b", "approve_menu", "po"),
    (r"\b(?:reject|decline|deny)\s+(?:po|p\.?o|p\s*o|purchase\s*order|purchse\s*order|procurement\s*order|buying\s*order|vendor\s*order)\b", "reject_menu", "po"),
    (r"\b(?:po|p\.?\s*o|purchase\s*order|purchse\s*order|procurement\s*order|buying\s*order|vendor\s*order|supplier\s*order)\s+(?:" + _S + r"|details?|info|list|tracking|view|summary|report|history)\b", "status", "po"),
    (r"\b(?:" + _S + r"|details?|tracking|summary|history)\s+(?:of\s+)?(?:po|p\.?o|purchase\s*order|procurement\s*order)\b", "status", "po"),
    (r"\b(?:show|view|check|list|my|track|see|open)\s+(?:all\s+)?(?:po|p\.?o|purchase\s*order|purchse\s*order|procurement\s*order|buying\s*order|vendor\s*order)s?\b", "status", "po"),
    (r"\b(?:po|p\.?o|p\s+o|poo|purchase\s*order|purchse\s*order|purcase\s*order|puchase\s*order|purchase\s*oder|p\s*order|purchase\s*o)\b", "navigate", "po"),
    (r"\b(?:procurement\s*order|buying\s*order|vendor\s*order|supplier\s*order)\b", "navigate", "po"),

    # ── RFQ actions (with fuzzy typo support) ──
    (r"\b(?:approve|accept)\s+(?:rfq|r\.?f\.?q|r\s*f\s*q|quotation|quote|request\s*for\s*quot(?:e|ation)|request\s*quote|vendor\s*quote|supplier\s*quote|price\s*quote)\s*#?\s*(\w[\w-]*)", "approve", "rfq"),
    (r"\b(?:reject|decline|deny)\s+(?:rfq|r\.?f\.?q|r\s*f\s*q|quotation|quote|request\s*for\s*quot(?:e|ation)|request\s*quote|vendor\s*quote|supplier\s*quote|price\s*quote)\s*#?\s*(\w[\w-]*)", "reject", "rfq"),
    (r"\b(?:approve|accept)\s+(?:rfq|r\.?f\.?q|quotation|quote|request\s*for\s*quot(?:e|ation))\b", "approve_menu", "rfq"),
    (r"\b(?:reject|decline|deny)\s+(?:rfq|r\.?f\.?q|quotation|quote|request\s*for\s*quot(?:e|ation))\b", "reject_menu", "rfq"),
    (r"\b(?:rfq|r\.?f\.?q|quotation|quote|request\s*for\s*quot(?:e|ation))\s+(?:" + _S + r"|details?|info|list|view|tracking|report|history)\b", "status", "rfq"),
    (r"\b(?:" + _S + r"|details?|info|tracking|history)\s+(?:of\s+)?(?:rfq|r\.?f\.?q|quotation|quote|request\s*for\s*quot(?:e|ation))\b", "status", "rfq"),
    (r"\b(?:show|view|check|list|my|see)\s+(?:all\s+)?(?:rfq|r\.?f\.?q|quotation|quote|request\s*for\s*quot(?:e|ation))s?\b", "status", "rfq"),
    (r"\b(?:rfq|r\.?f\.?q|r\s*f\s*q|rfqs|rfk|rqf|frq|quotation|quotaion|request\s*for\s*quot(?:e|ation)|request\s*quote|quote\s*request|price\s*quote|price\s*request|vendor\s*quote|supplier\s*quote|get\s*quote|ask\s*for\s*quote)\b", "navigate", "rfq"),

    # ── TICKET / QUERY / SUPPORT actions (with fuzzy typo support) ──
    (r"\b(?:raise|create|submit|open|new|log|file|report)\s+(?:a\s+)?(?:ticket|tickt|tciket|tiket|query|issue|complaint|support|incident|bug|service\s*request|support\s*request|grievance)\b", "navigate", "ticket"),
    (r"\b(?:ticket|tickt|tciket|tiket|support|support\s*ticket|help\s*ticket|query|issue|problem|complaint|complain|grievance|incident|bug\s*report|service\s*request|support\s*request)\b", "navigate", "ticket"),
    (r"\b(?:something\s+is\s+wrong|not\s+working|I\s+have\s+an?\s+issue|need\s+support|contact\s+support|escalate|escalation|report\s+issue|file\s+complaint|log\s+complaint|raise\s+issue|raise\s+complaint)\b", "navigate", "ticket"),

    # ── BUDGET actions ──
    (r"\b(?:budget|total\s*budget|available\s*budget|remaining\s*budget|budget\s*status|budget\s*dashboard|budget\s*summary|how\s*much\s*budget|money\s*left)\b", "navigate", "budget"),

    # ── VIEW DETAIL (drill-down into a specific item) ──
    (r"\b(?:view|show|open)\s+detail(?:s)?\s+(?:cart|card|crt|kart|indent)\s*#?\s*(\w[\w-]*)", "view_detail", "cart"),
    (r"\b(?:view|show|open)\s+detail(?:s)?\s+(?:po|purchase\s*order)\s*#?\s*(\w[\w-]*)", "view_detail", "po"),
    (r"\b(?:view|show|open)\s+detail(?:s)?\s+(?:rfq|quotation|quote)\s*#?\s*(\w[\w-]*)", "view_detail", "rfq"),
    (r"\b(?:detail|details|view detail)\s+(\w[\w-]*)", "view_detail", None),

    # ── ORDER navigation (maps to PO) ──
    (r"\b(?:order|oder|ordr|orddr|my\s*order|my\s*orders|all\s*orders|order\s*list|order\s*details|order\s*status|order\s*history|past\s*orders|recent\s*orders|procurement\s*order|material\s*request|supply\s*order|bulk\s*order)s?\b", "navigate", "po"),

    # ── STATUS standalone words ──
    (r"\b(?:track|tracking|track\s*order|where\s+is\s+my\s+order|progress|what\s+is\s+the\s+progress|pending|approved|rejected|in\s*progress|completed|processing|under\s*review|waiting|on\s*hold|dispatched|delivered|shipment\s*status|delivery\s*status|approval\s*status|payment\s*status|any\s*update|latest\s*update)\b", "status", None),

    # ── BARE submenu commands (rely on session context in chat.py) ──
    (r"^approve$", "approve_menu", None),
    (r"^reject(?:ion)?$", "reject_menu", None),
    (r"^status$", "status", None),
    (r"^(?:statuss|staus|stauts|sttaus|satuts|statu|statuz|statis)$", "status", None),
]

# Fuzzy synonyms for menu categories (used for fuzzy fallback matching)
ENTITY_SYNONYMS = {
    "cart": [
        "cart", "crt", "kart", "caart", "caat", "cartt", "cardt",
        "my cart", "shopping cart", "view cart", "open cart", "show cart",
        "check cart", "see cart", "cart list", "cart items", "items in cart",
        "what is in my cart", "basket", "my basket", "procurement cart",
        "purchase cart", "order cart", "go to cart", "cart details",
        "cart summary", "add to cart", "remove from cart", "update cart",
        "clear cart", "empty cart", "delete cart", "cart status",
        "pending cart", "saved cart", "draft cart", "new cart", "create cart",
        "manage cart", "edit cart", "carts", "my carts", "all carts",
        "active cart", "recent cart", "latest cart", "shopping bag",
        "procurement basket", "indent", "requisition",
    ],
    "po": [
        "po", "p.o", "p o", "poo", "purchase order", "purchse order",
        "purchase oder", "purcase order", "puchase order",
        "po list", "my po", "view po", "show po", "open po", "check po",
        "po status", "po details", "po number", "create po", "new po",
        "generate po", "make po", "raise po", "po summary", "all po",
        "pending po", "approved po", "rejected po", "po history",
        "old po", "recent po", "latest po", "active po", "closed po",
        "cancel po", "edit po", "update po", "manage po", "po report",
        "po tracker", "procurement order", "buying order", "vendor order",
        "supplier order", "po created", "po raised", "po approved",
        "p order", "purchase o", "order", "oder", "ordr", "my order",
        "my orders", "all orders", "order status", "order history",
    ],
    "rfq": [
        "rfq", "r.f.q", "r f q", "rfqs", "rfq list", "my rfq",
        "view rfq", "show rfq", "open rfq", "check rfq", "rfq status",
        "rfq details", "create rfq", "new rfq", "generate rfq",
        "raise rfq", "make rfq", "send rfq", "rfq number", "rfq summary",
        "all rfq", "pending rfq", "approved rfq", "rfq history",
        "request for quote", "request for quotation", "requst for quote",
        "request quote", "quote request", "ask for quote", "get quote",
        "quotation", "quotaion", "quotation request", "price quote",
        "price request", "vendor quote", "supplier quote",
        "quote from vendor", "rfq tracking", "rfq report", "rfq update",
        "rfq approved", "rfq rejected", "rfq closed",
        "rfk", "rqf", "frq", "rfq sent", "rfq response",
    ],
    "budget": [
        "budget", "total budget", "available budget", "remaining budget",
        "budget status", "budget dashboard", "budget summary",
        "how much budget", "money left",
    ],
    "ticket": [
        "ticket", "tickt", "tciket", "tiket", "raise ticket",
        "support", "support ticket", "help ticket", "create ticket",
        "new ticket", "open ticket", "submit ticket", "log ticket",
        "raise issue", "raise complaint", "complaint", "complain",
        "issue", "problem", "my problem", "I have an issue",
        "something is wrong", "not working", "need help", "need support",
        "contact support", "escalate", "escalation", "query",
        "raise query", "support query", "help request", "request help",
        "get help", "assist me", "assistance", "grievance",
        "report issue", "file complaint", "log complaint",
        "incident", "raise incident", "bug report", "report bug",
        "service request", "support request", "ticket status",
        "my tickets", "view tickets", "help desk",
    ],
}


def parse_intent(text: str) -> dict:
    """
    Parse user text into a structured intent.

    Returns:
        {
            "action": str,       # navigate/approve/reject/status/search/page/confirm/deny/back/help
            "entity": str|None,  # cart/po/rfq
            "id": str|None,      # entity identifier
            "page": int|None,    # page number
            "search": str|None,  # search query
            "raw": str,          # original text
        }
    """
    clean = text.lower().strip()

    result = {
        "action": None,
        "entity": None,
        "id": None,
        "page": None,
        "search": None,
        "raw": text,
    }

    for pattern, action, entity in INTENT_RULES:
        m = re.search(pattern, clean, re.IGNORECASE)
        if m:
            result["action"] = action
            result["entity"] = entity

            # Extract ID from capture group if present
            if m.lastindex:
                captured = m.group(m.lastindex).strip()
                if action == "page":
                    result["page"] = int(captured)
                elif action == "search":
                    result["search"] = captured
                elif action in ("approve", "reject", "view_detail"):
                    result["id"] = captured
            break

    # Handle "page next" / "page prev" without number
    if result["action"] == "page_next":
        result["action"] = "page"
        result["page"] = None  # caller will increment
    elif result["action"] == "page_prev":
        result["action"] = "page"
        result["page"] = -1  # caller will decrement

    # If no rule matched, try fuzzy entity matching
    if result["action"] is None:
        result["action"], result["entity"] = _fuzzy_match(clean)

    # Extract standalone ID if entity matched but no ID yet
    if result["entity"] and not result["id"]:
        id_match = re.search(r"#?\s*(\d{3,})", clean)
        if id_match:
            result["id"] = id_match.group(1)

    return result


def _fuzzy_match(text: str):
    """Fuzzy match text against entity synonyms. Returns (action, entity) or (None, None)."""
    best_score = 0
    best_entity = None

    for entity, synonyms in ENTITY_SYNONYMS.items():
        for syn in synonyms:
            score = SequenceMatcher(None, text, syn).ratio()
            if score > best_score and score >= 0.55:
                best_score = score
                best_entity = entity

    if best_entity:
        return "navigate", best_entity

    # Check for greeting (comprehensive list)
    greetings = [
        "hello", "hi", "hey", "good morning", "good afternoon", "good evening",
        "hey evs", "hi evs", "hello evs", "helo evs", "hay evs", "heya evs",
        "hy evs", "hii evs", "hello bot", "hi bot", "hey assistant",
        "hello assistant", "hi there", "hey there", "morning evs",
        "wake up", "start", "begin", "open", "launch", "activate",
        "yo evs", "sup evs", "hola evs", "hi eva", "hey eva", "hello eva",
        "hey ebs", "hi ebs", "hello ebs", "hey eves", "hi eves",
        "evs hello", "talk to evs", "need help", "hey jarvis",
        "hey procure", "hi procure", "evs bot", "evs assistant",
        "anyone there", "you there", "evs help", "namaste evs",
        "hello evsprocure", "whats up evs",
    ]
    for g in greetings:
        if g in text:
            return "greet", None

    return None, None


def search_patterns(text: str, session: dict = None):
    """Legacy compatibility wrapper — delegates to parse_intent."""
    return parse_intent(text)
