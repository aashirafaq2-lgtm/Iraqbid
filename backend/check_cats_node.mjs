import pool from './src/config/db.js';

async function check() {
  const cats = await pool.query("SELECT * FROM categories ORDER BY id ASC");
  console.log('Categories in DB:', cats.rows);
  const invCols = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'inventory_items'");
  console.log('category_id in inventory_items?', invCols.rows.map(r => r.column_name).includes('category_id'));
  await pool.end();
}
check().catch(console.error);
