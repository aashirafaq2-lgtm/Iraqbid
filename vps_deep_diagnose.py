import psycopg2
from psycopg2.extras import RealDictCursor

conn = psycopg2.connect("postgresql://iraqbid_user:IraqBid2026SecurePass!@127.0.0.1:5432/iraqbid_production")
cur = conn.cursor(cursor_factory=RealDictCursor)

print("=== 1. Inventory Items Constraints ===")
cur.execute("""
    SELECT conname, confrelid::regclass, pg_get_constraintdef(oid) 
    FROM pg_constraint 
    WHERE conrelid = 'inventory_items'::regclass OR conname LIKE '%receiving_employee%'
""")
for r in cur.fetchall():
    print(dict(r))

print("\n=== 2. Staff Users vs Users ===")
cur.execute("SELECT id, email, name, role FROM staff_users LIMIT 5")
print("Staff users:", [dict(r) for r in cur.fetchall()])

cur.execute("SELECT id, phone, name, role FROM users LIMIT 5")
print("Users:", [dict(r) for r in cur.fetchall()])

print("\n=== 3. Coupons Table Columns ===")
cur.execute("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'coupons'")
print("Coupons columns:", [r['column_name'] for r in cur.fetchall()])

print("\n=== 4. Categories ===")
cur.execute("SELECT id, name FROM categories")
print("Categories:", [dict(r) for r in cur.fetchall()])

cur.close()
conn.close()
