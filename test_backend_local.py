import requests

def test_endpoints():
    base = "http://localhost:5055/api"
    print("1. Health Check...")
    h = requests.get(f"{base}/health")
    print("Health:", h.json())

    print("\n2. Special Bidders List...")
    sb = requests.get(f"{base}/special-bidders")
    print("Special Bidders count:", len(sb.json().get('data', [])))
    for b in sb.json().get('data', [])[:3]:
        print("  -", b.get('name'), b.get('unique_id'), "active:", b.get('is_active'))

    print("\n3. Products List...")
    p = requests.get(f"{base}/products")
    print("Products response success:", p.json().get('success'))

    print("\n4. Coupons Admin List (auth check)...")
    c = requests.get(f"{base}/coupons/admin")
    print("Coupons response:", c.json())

    print("\n5. Categories...")
    cats = requests.get(f"{base}/categories")
    print("Categories count:", len(cats.json().get('data', cats.json().get('categories', []))))

test_endpoints()
