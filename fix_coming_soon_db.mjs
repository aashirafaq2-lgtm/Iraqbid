import pool from "./src/config/db.js";

async function fix() {
  await pool.query("ALTER TABLE products DROP CONSTRAINT IF EXISTS products_status_check");
  await pool.query("ALTER TABLE products ADD CONSTRAINT products_status_check CHECK (status IN ('pending', 'approved', 'rejected', 'active', 'sold', 'ended', 'cancelled', 'coming_soon'))");
  await pool.query("ALTER TABLE inventory_items DROP CONSTRAINT IF EXISTS inventory_items_status_check");
  await pool.query("ALTER TABLE inventory_items ADD CONSTRAINT inventory_items_status_check CHECK (status IN ('available', 'in_auction', 'sold', 'coming_soon', 'damaged', 'returned'))");
  console.log("CONSTRAINTS_UPDATED_OK");
  process.exit(0);
}

fix().catch(e => { console.error(e.message); process.exit(1); });
