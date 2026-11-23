const { Pool } = require('pg');
const pool = new Pool({
  connectionString: 'postgresql://iraqbid_user:IraqBid2026SecurePass!@127.0.0.1:5432/iraqbid_production'
});

async function run() {
  const oRes = await pool.query(`
    SELECT o.id, o.order_number, o.product_id, o.amount, o.created_at, p.title, p.image_url, p.images
    FROM orders o
    LEFT JOIN products p ON o.product_id = p.id
    ORDER BY o.id DESC LIMIT 5
  `);
  console.log("Recent orders:", JSON.stringify(oRes.rows, null, 2));

  const pRes = await pool.query(`
    SELECT id, title, image_url, current_bid, highest_bidder_id
    FROM products
    WHERE current_bid = 1250 OR title ILIKE '%iPhone 15%'
  `);
  console.log("Products matching 1250 or iPhone 15:", JSON.stringify(pRes.rows, null, 2));

  await pool.end();
}
run();
