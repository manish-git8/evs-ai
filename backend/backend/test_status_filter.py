"""
NLP Status Detection Test — validates that typed/voice status commands
map to the correct entity + API status value.

Run:  python test_status_filter.py
"""

# ─── Inline copy of the NLP matching logic from chat.py ───
# IMPORTANT: These values MUST exactly match _STATUS_KEYWORDS_BY_ENTITY in chat.py

_STATUS_KEYWORDS_BY_ENTITY = {
    # Values must match the actual API status field:
    # Cart: cartStatusType (UPPERCASE)  |  PO: orderStatus (UPPERCASE)
    # RFQ: rfqStatus via general /rfqs endpoint (UPPERCASE)
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

_STATUS_DEFAULT_ENTITY = {
    "approved": "cart",
    "po generated": "cart",
    "supplier shortlisted": "rfq", "shortlisted": "rfq",
    "confirmed": "po", "partially confirmed": "po", "partially approved": "po",
    "closed": "rfq", "created": "rfq", "completed": "rfq", "cancelled": "rfq",
}


def detect_status(text: str):
    """Simulate the NLP status detection from chat.py."""
    lower_text = text.lower().strip()
    detected_entity = None
    matched_status_phrase = ""

    for phrase in sorted(_STATUS_KEYWORDS_BY_ENTITY.keys(), key=len, reverse=True):
        if phrase in lower_text:
            matched_status_phrase = phrase
            break

    if not matched_status_phrase:
        return None, None

    remaining_text = lower_text.replace(matched_status_phrase, " ").strip()
    for phrase in sorted(_ENTITY_KEYWORDS.keys(), key=len, reverse=True):
        if phrase in remaining_text:
            detected_entity = _ENTITY_KEYWORDS[phrase]
            break

    if not detected_entity:
        detected_entity = _STATUS_DEFAULT_ENTITY.get(matched_status_phrase)

    if detected_entity:
        api_status = _STATUS_KEYWORDS_BY_ENTITY[matched_status_phrase].get(detected_entity)
        return detected_entity, api_status

    return None, None


# ─── Test cases ───

TESTS = [
    # (input_text, expected_entity, expected_api_status)
    # Cart statuses
    ("pending approval cart",       "cart", "PENDING_APPROVAL"),
    ("rejected cart",               "cart", "REJECTED"),
    ("submitted cart",              "cart", "SUBMITTED"),
    ("draft cart",                  "cart", "DRAFT"),
    ("po generated cart",           "cart", "POGENERATED"),
    ("approved cart",               "cart", "APPROVED"),
    ("show pending carts",          "cart", "PENDING_APPROVAL"),

    # PO statuses
    ("submitted po",               "po", "SUBMITTED"),
    ("pending approval po",        "po", "PENDING_APPROVAL"),
    ("partially approved po",      "po", "PARTIALLY_APPROVED"),
    ("confirmed po",               "po", "CONFIRMED"),
    ("rejected po",                "po", "REJECTED"),
    ("approved purchase order",    "po", "APPROVED"),

    # RFQ statuses
    ("closed rfq",                 "rfq", "CLOSED"),
    ("draft rfq",                  "rfq", "DRAFT"),
    ("submitted rfq",              "rfq", "SUBMITTED"),
    ("supplier shortlisted rfq",   "rfq", "SUPPLIER_SHORTLISTED"),
    ("shortlisted rfq",            "rfq", "SUPPLIER_SHORTLISTED"),

    # Default entity inference
    ("po generated",               "cart", "POGENERATED"),
    ("confirmed",                  "po",   "CONFIRMED"),
    ("partially approved",         "po",   "PARTIALLY_APPROVED"),
    ("supplier shortlisted",       "rfq",  "SUPPLIER_SHORTLISTED"),
    ("closed",                     "rfq",  "CLOSED"),

    # Voice/typed natural language commands
    ("show me pending approval carts",  "cart", "PENDING_APPROVAL"),
    ("draft procurement carts",         "cart", "DRAFT"),
    ("submitted rfqs",                  "rfq", "SUBMITTED"),
    ("partially confirmed po",          "po", "PARTIALLY_CONFIRMED"),
]

passed = 0
failed = 0
results = []

for text, expected_entity, expected_status in TESTS:
    entity, status = detect_status(text)
    ok = entity == expected_entity and status == expected_status
    if ok:
        passed += 1
        results.append(f"  ✅ PASS: '{text}' → entity={entity}, status={status}")
    else:
        failed += 1
        results.append(f"  ❌ FAIL: '{text}' → entity={entity}, status={status} (expected: entity={expected_entity}, status={expected_status})")

print(f"\nStatus Detection NLP Tests: {passed}/{passed + failed} passed\n")
for line in results:
    print(line)

if failed:
    print(f"\n⚠️  {failed} test(s) FAILED")
else:
    print("\n✅ All tests passed!")
