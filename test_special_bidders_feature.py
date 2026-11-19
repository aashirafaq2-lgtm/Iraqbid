import requests

base = "http://localhost:5055/api/special-bidders"

print("--- 1. Fetching all Special Bidder profiles ---")
r1 = requests.get(base)
print("Count:", len(r1.json().get("data", [])))
for b in r1.json().get("data", []):
    print(f"  • {b['name']} ({b['unique_id']}) - Active: {b['is_active']} - Total Bids: {b['total_bids_placed']}")

print("\n--- 2. Creating a new Special Bidder profile ---")
r2 = requests.post(base, json={"name": "Bidder VIP Test", "unique_id": "SB-VIP-99", "is_active": True})
print("Create response:", r2.json().get("success"), r2.json().get("message"))

print("\n--- 3. Checking Audit Logs Endpoint ---")
r3 = requests.get(f"{base}/history/logs")
print("Logs query success:", r3.json().get("success"), "Total logs:", len(r3.json().get("data", [])))
