const { Pool } = require('/var/www/bid-backend/Bid-app-Backend/node_modules/pg');
require('/var/www/bid-backend/Bid-app-Backend/node_modules/dotenv').config({ path: '/var/www/bid-backend/Bid-app-Backend/.env' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://iraqbid_user:IraqBid2026SecurePass!@127.0.0.1:5432/iraqbid_production'
});

async function run() {
  const query = `
    WITH user_won AS (
      SELECT 
        o.id as order_id,
        o.product_id,
        o.created_at as won_date,
        COALESCE(o.original_amount, o.amount) as original_amount,
        COALESCE(o.discount_amount, 0) as discount_amount,
        COALESCE(o.final_price, o.amount) as final_price,
        o.coupon_code,
        COALESCE(o.delivery_status, o.status, 'pending') as order_status
      FROM orders o
      WHERE o.buyer_id = $1

      UNION ALL

      SELECT 
        NULL as order_id,
        p.id as product_id,
        p.auction_end_time as won_date,
        COALESCE(p.current_bid, p.starting_bid, 0) as original_amount,
        0 as discount_amount,
        COALESCE(p.current_bid, p.starting_bid, 0) as final_price,
        NULL as coupon_code,
        'pending' as order_status
      FROM products p
      WHERE p.highest_bidder_id = $1
        AND (p.auction_end_time <= NOW() OR p.status IN ('sold', 'ended'))
        AND NOT EXISTS (SELECT 1 FROM orders o WHERE o.product_id = p.id AND o.buyer_id = $1)
    )
    SELECT 
      uw.order_id,
      uw.product_id,
      p.title,
      uw.original_amount,
      uw.final_price,
      uw.coupon_code,
      uw.order_status,
      (SELECT COUNT(*) FROM bids WHERE product_id = p.id) as total_bids
    FROM user_won uw
    JOIN products p ON p.id = uw.product_id
    ORDER BY uw.won_date DESC;
  `;
  const res = await pool.query(query, [10]);
  console.log('Total won rows for User 10:', res.rows.length);
  console.table(res.rows);
  await pool.end();
}

run().catch(console.error);
