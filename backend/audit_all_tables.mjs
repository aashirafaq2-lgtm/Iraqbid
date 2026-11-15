import pool from './src/config/db.js';

async function check() {
  const invCols = await pool.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'inventory_items'");
  console.log('inventory_items cols:', invCols.rows.map(r => r.column_name));

  const prodCols = await pool.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'products'");
  console.log('products cols:', prodCols.rows.map(r => r.column_name));

  const orderCols = await pool.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'orders'");
  console.log('orders cols:', orderCols.rows.map(r => r.column_name));

  const autoBids = await pool.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'system_auto_bids'");
  console.log('system_auto_bids cols:', autoBids.rows.map(r => r.column_name));

  await pool.end();
}
check().catch(console.error);

