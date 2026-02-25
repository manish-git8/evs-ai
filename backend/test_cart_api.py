"""Test the full cart flow and write results to a file."""
import requests
import json
import time

BASE = "http://localhost:8000"
SESSION = "test-debug-004"
OUT = []

def log(s):
    OUT.append(s)

def chat(text):
    r = requests.post(
        BASE + "/chat",
        json={"text": text, "session_id": SESSION, "source": "text", "token": ""},
        timeout=15,
    )
    return r.json()

log("STEP 1: Create cart")
resp = chat("create new cart")
log("Success: " + str(resp.get("success")))
log("Cart: " + str(resp.get("cart_details")))
log("Mode: " + str(resp.get("mode")))
log("Resp: " + str(resp.get("response", ""))[:500])
log("")

time.sleep(1)

log("STEP 2: Add 2 keyboards")
resp = chat("add 2 keyboards")
log("Success: " + str(resp.get("success")))
log("Resp: " + str(resp.get("response", ""))[:500])
log("")

time.sleep(1)

log("STEP 3: Done")
resp = chat("done")
log("Success: " + str(resp.get("success")))
log("Resp: " + str(resp.get("response", ""))[:500])
log("")

time.sleep(1)

log("STEP 4: Submit")
resp = chat("yes")
log("Success: " + str(resp.get("success")))
log("Resp: " + str(resp.get("response", ""))[:500])
log("")

# Write output
with open("test_result.log", "w", encoding="utf-8") as f:
    f.write("\n".join(OUT))

print("DONE - check test_result.log")
