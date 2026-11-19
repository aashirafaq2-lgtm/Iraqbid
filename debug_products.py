import requests

base = "http://localhost:5055/api"
r = requests.get(f"{base}/products")
print("Status:", r.status_code)
print("Products response:", r.json())
