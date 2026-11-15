import cron from 'node-cron';
import pool from '../config/db.js';
import { logActivity } from '../middleware/enterprisePermissions.js';

/**
 * IRAQ BID System Automatic Bidder Bot (Last 10-Minute Reserve Protection Engine)
 * Runs every minute to inspect active auctions nearing completion.
 */
export const startSystemAutoBidder = () => {
  console.log('🤖 [AUTO-BIDDER] Background cron scheduler initialized (runs every 60s)');

  cron.schedule('* * * * *', async () => {
    try {
      // 1. Check if master toggle is enabled
      const toggleRes = await pool.query("SELECT setting_value FROM app_settings WHERE setting_key = 'auto_bidder_enabled'");
      const isEnabled = toggleRes.rows[0]?.setting_value === 'true';
      if (!isEnabled) return;

      const windowRes = await pool.query("SELECT setting_value FROM app_settings WHERE setting_key = 'auto_bidder_window_minutes'");
      const windowMinutes = parseInt(windowRes.rows[0]?.setting_value || '10');

      // 2. Find active auctions inside the activation window (e.g. <= 10 minutes left)
      const query = `
        SELECT 
          p.id as product_id,
          p.title,
          p.starting_bid,
          p.current_bid,
          p.auction_end_time,
          p.highest_bidder_id,
          inv.id as inventory_item_id,
          inv.min_acceptable_price,
          inv.auto_bid_increment
        FROM products p
        JOIN inventory_items inv ON inv.published_product_id = p.id
        WHERE p.status = 'active'
          AND p.auction_end_time > NOW()
          AND p.auction_end_time <= (NOW() + INTERVAL '${windowMinutes} minutes')
          AND inv.min_acceptable_price IS NOT NULL
          AND p.current_bid < inv.min_acceptable_price;
      `;

      const candidates = await pool.query(query);
      if (candidates.rows.length === 0) return;

      const botUserRes = await pool.query("SELECT id FROM users WHERE role = 'superadmin' OR role = 'admin' ORDER BY id ASC LIMIT 1");
      const systemBidderId = botUserRes.rows[0]?.id || 1;

      for (const item of candidates.rows) {
        const currentBid = parseFloat(item.current_bid || item.starting_bid || 0);
        const minPrice = parseFloat(item.min_acceptable_price);
        const increment = parseFloat(item.auto_bid_increment || 1.00);

        if (item.highest_bidder_id === systemBidderId) continue;

        let nextBid = currentBid + increment;
        if (nextBid > minPrice) {
          nextBid = minPrice;
        }

        const client = await pool.connect();
        try {
          await client.query('BEGIN');

          await client.query(`
            INSERT INTO bids (product_id, user_id, bid_amount, created_at)
            VALUES ($1, $2, $3, NOW())
          `, [item.product_id, systemBidderId, nextBid]);

          await client.query(`
            UPDATE products 
            SET current_bid = $1, highest_bidder_id = $2, updated_at = NOW()
            WHERE id = $3
          `, [nextBid, systemBidderId, item.product_id]);

          await client.query(`
            INSERT INTO system_auto_bids (auction_id, inventory_item_id, system_bidder_id, bid_amount, min_acceptable_price, is_system_generated)
            VALUES ($1, $2, $3, $4, $5, TRUE)
          `, [item.product_id, item.inventory_item_id, systemBidderId, nextBid, minPrice]);

          await client.query('COMMIT');

          console.log(`🤖 [AUTO-BIDDER] Bot placed automated reserve bid of $${nextBid} on Auction #${item.product_id} (${item.title})`);

          await logActivity({
            employeeId: systemBidderId,
            employeeName: 'IRAQ BID Auto-Bidder Engine',
            actionType: 'SYSTEM_AUTOMATED_BID',
            entityType: 'AUCTION',
            entityId: item.product_id,
            details: {
              product_title: item.title,
              bid_amount: nextBid,
              min_acceptable_price: minPrice,
              previous_bid: currentBid
            }
          });
        } catch (bidErr) {
          await client.query('ROLLBACK');
          console.error(`❌ [AUTO-BIDDER] Error placing bid on auction #${item.product_id}:`, bidErr.message);
        } finally {
          client.release();
        }
      }
    } catch (err) {
      console.error('❌ [AUTO-BIDDER] Scheduler error:', err.message);
    }
  });
};
