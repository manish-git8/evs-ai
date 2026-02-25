"""Quick test for the pattern_service entity resolution."""
from services.pattern_service import parse_intent

tests = [
    "rfq cart status",
    "po cart status",
    "cart status",
    "rfq status",
    "po status",
    "show rfq carts",
    "show po carts",
    "show my carts",
]

with open("test_output.txt", "w") as f:
    for t in tests:
        r = parse_intent(t)
        f.write(f"{t:25s} -> entity={str(r['entity']):6s}  action={r['action']}\n")
    f.write("DONE\n")
print("Output written to test_output.txt")
