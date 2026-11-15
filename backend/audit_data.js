import pool from '/var/www/bid-backend/Bid-app-Backend/src/config/db.js';

async function auditData() {
  const tables = [
    'users', 'products', 'bids', 'orders', 'inventory_items', 
    'barcodes', 'customer_refusals', 'customer_order_labels', 
    'admin_activity_log', 'referral_rewards', 'referrals'
  ];

  for (const t of tables) {
    try {
      const res = await pool.query(`SELECT COUNT(*) FROM ${t}`);
      console.log(`Table ${t}: ${res.rows[0].count} rows`);
    } catch (e) {
      console.log(`Table ${t}: ERROR - ${e.message}`);
    }
  }

  // Check sample orders
  try {
    const ordersRes = await pool.query(`
      SELECT o.id, o.buyer_id, o.product_id, o.total_amount, o.delivery_status, o.payment_status,
             p.title, u.name as buyer_name, u.phone as buyer_phone
      FROM orders o
      LEFT JOIN products p ON o.product_id = p.id
      LEFT JOIN users u ON o.buyer_id = u.id
      LIMIT 5;
    `);
    console.log('SAMPLE_ORDERS:', JSON.stringify(ordersRes.rows, null, 2));
  } catch (e) {
    console.log('ORDERS_SAMPLE_ERROR:', e.message);
  }

  // Check sample products
  try {
    const prodRes = await pool.query(`
      SELECT id, title, starting_bid, current_bid, buy_now_price, status, auction_end_time 
      FROM products 
      ORDER BY id DESC 
      LIMIT 5;
    `);
    console.log('SAMPLE_PRODUCTS:', JSON.stringify(prodRes.rows, null, 2));
  } catch (e) {
    console.log('PRODUCTS_SAMPLE_ERROR:', e.message);
  }

  process.exit(0);
}

auditData();

