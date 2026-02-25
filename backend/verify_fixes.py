import asyncio
import os
import sys

# Add backend to path
sys.path.append(os.path.abspath(r"c:\Users\lenovo\OneDrive\Desktop\EVS VOICE\evs-AI-main\evs-AI-main\chatbot\backend"))

from services.inventory_service import fetch_internal_catalog, get_product_info
from services.procurement import get_user_settings_defaults

async def verify():
    # Mock token for testing (or use a real one if available, but here we just check logic/connectivity)
    # We will look for logs of the actual API calls
    token = "MOCK_TOKEN" # We can't really test the API without a real token easily here
    company_id = 45 # Use a likely company id
    
    print("--- Testing Inventory Service (Global + Internal) ---")
    try:
        # This will trigger the new fetch_internal_catalog logic
        # Note: Without a real token it will fail, but we're testing if it tries to hit BOTH endpoints
        catalog = await fetch_internal_catalog(token, company_id)
        print(f"Catalog size: {len(catalog)}")
        if catalog:
            item = list(catalog.values())[0]
            print(f"Sample item: {item['description']} - Price: {item['unit_price']}")
    except Exception as e:
        print(f"Inventory Service call failed (expected if no real token): {e}")

    print("\n--- Testing User Defaults Service ---")
    try:
        defaults = await get_user_settings_defaults(token, company_id)
        print(f"Defaults fetched: {list(defaults.keys())}")
    except Exception as e:
        print(f"Defaults Service call failed: {e}")

if __name__ == "__main__":
    asyncio.run(verify())
