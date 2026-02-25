"""Test the end-to-end cart creation flow via the backend API."""
import requests
import base64
import json

# Create a mock JWT payload
payload = {"entityid": 1, "userid": 1, "sub": "1"}
p = base64.urlsafe_b64encode(json.dumps(payload).encode()).decode().rstrip("=")
token = f"eyJ.{p}.sig"

BASE = "http://localhost:8000"
SID = "test-e2e-flow"

def chat(text):
    r = requests.post(f"{BASE}/chat", json={
        "text": text, "session_id": SID, "source": "voice", "token": token
    })
    return r.json()

# Step 1: Create cart
print("=== STEP 1: create new cart ===")
d = chat("create new cart")
print("success:", d.get("success"))
print("mode:", d.get("mode"))
has_items = "Available Items" in d.get("response", "")
print("has available items list:", has_items)
resp = d.get("response", "")
print("response (first 300 chars):", resp[:300])
print()

# Step 2: Add items
print("=== STEP 2: add 2 laptops ===")
d = chat("add 2 laptops")
print("success:", d.get("success"))
print("mode:", d.get("mode"))
print("response:", d.get("response", "")[:200])
print()

# Step 3: Add another item
print("=== STEP 3: add one mouse ===")
d = chat("add one mouse")
print("success:", d.get("success"))
print("mode:", d.get("mode"))
print("response:", d.get("response", "")[:200])
print()

# Step 4: Done
print("=== STEP 4: done ===")
d = chat("done")
print("success:", d.get("success"))
print("mode:", d.get("mode"))
print("response:", d.get("response", "")[:400])
print()

# Step 5: Submit
print("=== STEP 5: yes ===")
d = chat("yes")
print("success:", d.get("success"))
print("mode:", d.get("mode"))
print("response:", d.get("response", "")[:200])
print()

print("=== TEST COMPLETE ===")
