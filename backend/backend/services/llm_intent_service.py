"""
LLM-powered intent extraction service.

Uses Ollama (local Mistral model) to extract structured intents from
natural language text. Falls back to regex-based pattern_service if
LLM is unavailable or returns invalid JSON.

Supported intents:
  - navigate, approve, reject, status, approve_menu, reject_menu
  - search, page, confirm, deny, back, help, view_detail
  - greet, clear_search
"""

import json
import logging
import httpx
from config.settings import settings
from services.pattern_service import parse_intent as regex_parse_intent

logger = logging.getLogger(__name__)

# ─────────────────────────────────────────────────────────
# System prompt for structured intent extraction
# ─────────────────────────────────────────────────────────

SYSTEM_PROMPT = """You are an intent parser for a procurement chatbot. Extract the user's intent from their message and return ONLY a JSON object (no markdown, no explanation).

The JSON must have these fields:
- "action": one of: navigate, approve, reject, approve_menu, reject_menu, status, search, page, confirm, deny, back, help, view_detail, greet, clear_search
- "entity": one of: cart, po, rfq, ticket, budget, or null
- "id": entity identifier string if mentioned (e.g., "1414", "PO-123"), or null
- "page": page number as integer if mentioned, or null
- "search": search query string if searching, or null

CRITICAL ENTITY RULES (follow strictly):
- If the user mentions "RFQ" anywhere (e.g., "rfq cart status", "rfq status", "show rfq carts"), entity MUST be "rfq", NEVER "cart".
- If the user mentions "PO" or "purchase order" anywhere (e.g., "po cart status", "po status"), entity MUST be "po", NEVER "cart".
- Entity "cart" should ONLY be used when the user asks about carts/indents WITHOUT mentioning RFQ or PO.

Examples:
- "approve cart 1414" → {"action":"approve","entity":"cart","id":"1414","page":null,"search":null}
- "show my carts" or "cart status" → {"action":"status","entity":"cart","id":null,"page":null,"search":null}
- "rfq cart status" or "rfq status" or "show rfq carts" → {"action":"status","entity":"rfq","id":null,"page":null,"search":null}
- "po cart status" or "po status" or "show po carts" → {"action":"status","entity":"po","id":null,"page":null,"search":null}
- "approve" (bare) → {"action":"approve_menu","entity":null,"id":null,"page":null,"search":null}
- "yes" or "confirm" → {"action":"confirm","entity":null,"id":null,"page":null,"search":null}
- "no" or "cancel" → {"action":"deny","entity":null,"id":null,"page":null,"search":null}
- "back" → {"action":"back","entity":null,"id":null,"page":null,"search":null}
- "page 3" → {"action":"page","entity":null,"id":null,"page":3,"search":null}
- "search laptop" → {"action":"search","entity":null,"id":null,"page":null,"search":"laptop"}
- "hi" or "hello" → {"action":"greet","entity":null,"id":null,"page":null,"search":null}
- "reject po 5678" → {"action":"reject","entity":"po","id":"5678","page":null,"search":null}
- "rfq" → {"action":"navigate","entity":"rfq","id":null,"page":null,"search":null}
- "raise ticket" → {"action":"navigate","entity":"ticket","id":null,"page":null,"search":null}
- "budget" → {"action":"navigate","entity":"budget","id":null,"page":null,"search":null}
- "the first one" or "approve the second one" → use context: {"action":"approve","entity":null,"id":"__ORDINAL_1__","page":null,"search":null}
- "view detail cart 100" → {"action":"view_detail","entity":"cart","id":"100","page":null,"search":null}

Synonyms: indent/requisition = cart, purchase order = po, quotation/quote = rfq

Return ONLY the JSON object, nothing else."""


# ─────────────────────────────────────────────────────────
# LLM intent extraction via Ollama
# ─────────────────────────────────────────────────────────

async def _call_ollama(text: str) -> dict | None:
    """Call Ollama API and parse the JSON response."""
    try:
        async with httpx.AsyncClient(timeout=settings.LLM_TIMEOUT) as client:
            response = await client.post(
                f"{settings.OLLAMA_BASE_URL}/api/generate",
                json={
                    "model": settings.OLLAMA_MODEL,
                    "prompt": f"User message: \"{text}\"\n\nExtract the intent as JSON:",
                    "system": SYSTEM_PROMPT,
                    "stream": False,
                    "options": {
                        "temperature": 0.1,  # Low temperature for deterministic output
                        "num_predict": 200,  # Short output expected
                    },
                },
            )
            response.raise_for_status()
            data = response.json()
            raw_text = data.get("response", "").strip()

            # Try to extract JSON from the response
            # Sometimes LLM wraps it in markdown code blocks
            if "```" in raw_text:
                # Extract content between code fences
                import re
                match = re.search(r"```(?:json)?\s*(.*?)\s*```", raw_text, re.DOTALL)
                if match:
                    raw_text = match.group(1)

            parsed = json.loads(raw_text)

            # Validate required fields
            if "action" not in parsed:
                logger.warning(f"[LLM] Missing 'action' in response: {raw_text}")
                return None

            return parsed

    except httpx.TimeoutException:
        logger.warning("[LLM] Ollama request timed out")
        return None
    except httpx.ConnectError:
        logger.warning("[LLM] Cannot connect to Ollama — is it running?")
        return None
    except json.JSONDecodeError as e:
        logger.warning(f"[LLM] Failed to parse JSON from Ollama: {e}")
        return None
    except Exception as e:
        logger.error(f"[LLM] Unexpected error: {e}")
        return None


def _resolve_ordinal(llm_result: dict, session: dict) -> dict:
    """Resolve ordinal references like '__ORDINAL_1__' using session context."""
    target_id = llm_result.get("id")
    if not target_id or not isinstance(target_id, str) or "__ORDINAL_" not in target_id:
        return llm_result

    # Extract ordinal number
    import re
    match = re.search(r"__ORDINAL_(\d+)__", target_id)
    if not match:
        return llm_result

    ordinal_idx = int(match.group(1)) - 1  # 0-based index
    last_items = session.get("last_items", [])

    if 0 <= ordinal_idx < len(last_items):
        item = last_items[ordinal_idx]
        llm_result["id"] = str(
            item.get("cartId") or item.get("purchaseOrderId") or
            item.get("rfqId") or item.get("id") or ""
        )
        # Infer entity from the item if not set
        if not llm_result.get("entity"):
            llm_result["entity"] = session.get("menu")
    else:
        llm_result["id"] = None

    return llm_result


async def parse_intent_llm(text: str, session: dict = None) -> dict:
    """
    Parse user intent using LLM (primary) with regex fallback.

    Returns the same dict format as pattern_service.parse_intent:
        {action, entity, id, page, search, raw}
    """
    result = {
        "action": None,
        "entity": None,
        "id": None,
        "page": None,
        "search": None,
        "raw": text,
    }

    # ── Try LLM first if enabled ──
    if settings.LLM_ENABLED:
        llm_result = await _call_ollama(text)
        if llm_result and llm_result.get("action"):
            # Resolve ordinal references using session context
            if session:
                llm_result = _resolve_ordinal(llm_result, session)

            result["action"] = llm_result.get("action")
            result["entity"] = llm_result.get("entity")
            result["id"] = llm_result.get("id")
            result["page"] = llm_result.get("page")
            result["search"] = llm_result.get("search")
            logger.info(f"[LLM] Intent extracted: {result}")
            return result

        logger.info("[LLM] Falling back to regex intent parser")

    # ── Fallback to regex ──
    return regex_parse_intent(text)

