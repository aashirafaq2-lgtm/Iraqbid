import pool from './src/config/db.js';

async function check() {
  const t1 = await pool.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'system_auto_bids'");
  console.log('system_auto_bids columns:', t1.rows);
  const t2 = await pool.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'customer_order_labels'");
  console.log('customer_order_labels columns:', t2.rows);
  await pool.end();
}
check().catch(console.error);

