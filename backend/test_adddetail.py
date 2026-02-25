"""
Direct test: login -> create cart -> addDetail -> verify.
This uses the exact same endpoints as the dashboard.
"""
import requests
import json
import base64
import sys

EVS_API = "https://demo.evsprocure.com/api/ep/v1"
OUT = []

def log(s):
    OUT.append(str(s))
    print(s)

# Step 1: Login
log("=== STEP 1: Login ===")
login_resp = requests.post(
    EVS_API + "/authentication/authenticate",
    json={"email": "meru@globexintl.com", "password": "Test@1234", "entityType": "BUYER"},
    headers={"Content-Type": "application/json"},
    timeout=15,
)
log("Login status: " + str(login_resp.status_code))
login_data = login_resp.json() if login_resp.status_code == 200 else {}

token = login_data.get("jwtToken", "")
if not token:
    log("Login failed. Response: " + json.dumps(login_data)[:300])
    # Try without entityType
    login_resp = requests.post(
        EVS_API + "/authentication/authenticate",
        json={"email": "meru@globexintl.com", "password": "Test@1234"},
        headers={"Content-Type": "application/json"},
        timeout=15,
    )
    login_data = login_resp.json() if login_resp.status_code == 200 else {}
    token = login_data.get("jwtToken", "")
    log("Retry status: " + str(login_resp.status_code))

if not token:
    log("COULD NOT LOGIN. Keys: " + str(list(login_data.keys())))
    log("Full: " + json.dumps(login_data)[:500])
    with open("adddetail_test.log", "w", encoding="utf-8") as f:
        f.write("\n".join(OUT))
    sys.exit(1)

log("Token: " + token[:40] + "...")

# Decode JWT to get company_id
parts = token.split(".")
payload_b64 = parts[1] + "=" * (4 - len(parts[1]) % 4)
jwt_data = json.loads(base64.urlsafe_b64decode(payload_b64))
company_id = jwt_data.get("entityid") or jwt_data.get("entityId") or jwt_data.get("companyId")
user_id = str(jwt_data.get("userid") or jwt_data.get("userId") or jwt_data.get("sub") or "")
log("Company: " + str(company_id) + ", User: " + str(user_id))

headers = {"Authorization": "Bearer " + token, "Content-Type": "application/json"}

# Step 2: Create cart
log("\n=== STEP 2: Create cart ===")
cart_resp = requests.post(
    EVS_API + "/company/" + str(company_id) + "/cart",
    json={"companyId": company_id},
    headers=headers,
    timeout=15,
)
log("Cart status: " + str(cart_resp.status_code))
cart_data = cart_resp.json() if cart_resp.status_code in (200, 201) else {}
log("Cart response: " + json.dumps(cart_data)[:500])

cart_id = cart_data.get("cartId") or cart_data.get("id") or ""
cart_no = cart_data.get("cartNo") or ""
log("Cart ID: " + str(cart_id) + ", Cart No: " + str(cart_no))

if not cart_id:
    log("COULD NOT CREATE CART")
    with open("adddetail_test.log", "w", encoding="utf-8") as f:
        f.write("\n".join(OUT))
    sys.exit(1)

# Step 3: Add item via addDetail (same format as dashboard)
log("\n=== STEP 3: addDetail ===")
add_body = {
    "cartId": int(cart_id) if str(cart_id).isdigit() else cart_id,
    "supplierId": None,
    "projectId": None,
    "catalogId": None,
    "catalogItemId": {
        "CatalogItemId": None,
        "PartId": "Mobile",
        "ProductImageURL": "",
    },
    "partId": "Mobile",
    "partDescription": "Mobile",
    "departmentId": None,
    "orderType": 0,
    "glAccountId": None,
    "isCritical": True,
    "isSafetyAppReq": False,
    "slimit": "some limit",
    "qty": 2,
    "price": 0,
    "unitOfMeasure": "piece",
    "currencyCode": "USD",
    "internalBuyerQuoteFile": 0,
    "priceUpdate": False,
    "classId": None,
    "locationId": None,
    "productId": 1,
    "manufacturerName": "",
    "manufacturerPart": "",
}
log("Request body: " + json.dumps(add_body)[:500])

add_resp = requests.post(
    EVS_API + "/company/" + str(company_id) + "/cart/" + str(cart_id) + "/addDetail",
    json=add_body,
    headers=headers,
    timeout=15,
)
log("addDetail status: " + str(add_resp.status_code))
log("addDetail response: " + add_resp.text[:500])

# Step 4: Read cart details to see if item was added
log("\n=== STEP 4: Verify cart ===")
detail_resp = requests.get(
    EVS_API + "/company/" + str(company_id) + "/cart/cartDetail?cartId=" + str(cart_id),
    headers=headers,
    timeout=15,
)
log("Detail status: " + str(detail_resp.status_code))
log("Detail response: " + detail_resp.text[:800])

with open("adddetail_test.log", "w", encoding="utf-8") as f:
    f.write("\n".join(OUT))

log("\n===== DONE =====")
