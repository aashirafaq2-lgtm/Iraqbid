import pool from './src/config/db.js';

async function check() {
  const inv = await pool.query("SELECT id, barcode, product_name, status, published_product_id FROM inventory_items WHERE status = 'in_auction' OR published_product_id IS NOT NULL");
  console.log('Inventory in_auction:', JSON.stringify(inv.rows, null, 2));
  const prods = await pool.query("SELECT id, title, status, starting_bid, current_bid, starting_price, is_active FROM products ORDER BY id DESC LIMIT 5");
  console.log('Recent products:', JSON.stringify(prods.rows, null, 2));
  const act = await pool.query("SELECT p.id, p.title, p.status, p.starting_bid FROM products p WHERE p.status IN ('active', 'approved')");
  console.log('Active/Approved in products:', JSON.stringify(act.rows, null, 2));
  await pool.end();
}
check().catch(console.error);

