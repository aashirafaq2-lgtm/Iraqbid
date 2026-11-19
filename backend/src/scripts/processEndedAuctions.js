/**
 * Process Ended Auctions - Synchronized with Enterprise Inventory & Orders
 * 
 * 1. Checks auctions that ended
 * 2. Checks if won by real buyer vs system automatic bot
 * 3. If won by real buyer -> creates Order linked to inventory, changes inventory status to 'sold'
 * 4. If won by system bot or no buyer -> returns product to 'available' in inventory, marks product 'unsold'
 * 5. Sends notifications and logs permanent audit trail
 */

import pool from '../config/db.js';
import { notifyUser } from '../utils/notificationUtils.js';
import { logActivity } from '../middleware/enterprisePermissions.js';

async function processEndedAuctions() {
    try {
        const endedAuctions = await pool.query(`
          SELECT 
            p.id,
            p.title,
            p.highest_bidder_id,
            p.current_bid,
            p.seller_id,
            p.auction_end_time,
            winner.name as winner_name,
            winner.email as winner_email,
            winner.role as winner_role,
            inv.id as inventory_item_id,
            inv.min_acceptable_price,
            inv.barcode as item_barcode
          FROM products p
          LEFT JOIN users winner ON p.highest_bidder_id = winner.id
          LEFT JOIN inventory_items inv ON inv.published_product_id = p.id
          WHERE p.status IN ('approved', 'active')
            AND p.auction_end_time <= NOW()
            AND (p.auction_processed IS NULL OR p.auction_processed = false)
        `);

        if (endedAuctions.rows.length === 0) {
            return;
        }

        console.log(`📢 Found ${endedAuctions.rows.length} ended auction(s) to process`);

        for (const auction of endedAuctions.rows) {
            const client = await pool.connect();
            try {
                await client.query('BEGIN');

                // Check if winner is a bot/admin or no winner
                const isWonByBotOrAdmin = auction.winner_role === 'admin' || auction.winner_role === 'superadmin';
                const hasValidWinner = Boolean(auction.highest_bidder_id && !isWonByBotOrAdmin);

                if (hasValidWinner) {
                    // 1. Create order linked to physical inventory
                    const orderNumber = `IQB-ORD-${Date.now().toString().slice(-6)}`;
                    const sellerId = auction.seller_id || 8;
                    const orderRes = await client.query(`
                      INSERT INTO orders (
                        product_id, buyer_id, seller_id, amount, final_price, 
                        shipping_cost, delivery_status, payment_status, 
                        inventory_item_id, order_number, created_at, status
                      ) VALUES ($1, $2, $3, $4, $4, 5.00, 'pending', 'pending', $5, $6, NOW(), 'pending')
                      RETURNING id;
                    `, [
                      auction.id, 
                      auction.highest_bidder_id, 
                      sellerId,
                      auction.current_bid, 
                      auction.inventory_item_id || null, 
                      orderNumber
                    ]);

                    const newOrderId = orderRes.rows[0].id;

                    // 2. Pre-generate Customer Order Label Snapshot (1 USD = 1,520 IQD)
                    const exchangeRate = 1520.00;
                    const usdTotal = parseFloat(auction.current_bid) + 5.00;
                    const iqdTotal = Math.round(usdTotal * exchangeRate);

                    await client.query(`
                      INSERT INTO customer_order_labels (
                        order_id, usd_total, exchange_rate, iqd_total, 
                        shipping_fee_usd, printed_count, created_at
                      ) VALUES ($1, $2, $3, $4, 5.00, 0, NOW())
                      ON CONFLICT DO NOTHING;
                    `, [newOrderId, usdTotal, exchangeRate, iqdTotal]);

                    // 3. Update inventory item status to 'sold'
                    if (auction.inventory_item_id) {
                        await client.query(`
                          UPDATE inventory_items 
                          SET status = 'sold', updated_at = NOW() 
                          WHERE id = $1
                        `, [auction.inventory_item_id]);
                    }

                    // 4. Mark product as sold
                    await client.query(`
                      UPDATE products 
                      SET auction_processed = true, status = 'sold', updated_at = NOW() 
                      WHERE id = $1
                    `, [auction.id]);

                    await client.query('COMMIT');

                    // Notify winner
                    await notifyUser(
                        auction.highest_bidder_id,
                        'Auction Won!',
                        `Congratulations! You won the auction for "${auction.title}" with a winning bid of $${auction.current_bid}. Order #${orderNumber} generated.`,
                        'auction_won',
                        auction.id
                    );

                    console.log(`  ✅ Auction #${auction.id} won by customer ${auction.winner_name}. Order #${newOrderId} created.`);
                } else {
                    // Reserve not reached or won by system bot: Product returned to available warehouse stock
                    if (auction.inventory_item_id) {
                        await client.query(`
                          UPDATE inventory_items 
                          SET status = 'available', published_product_id = null, updated_at = NOW() 
                          WHERE id = $1
                        `, [auction.inventory_item_id]);
                    }

                    await client.query(`
                      UPDATE products 
                      SET auction_processed = true, status = 'ended', updated_at = NOW() 
                      WHERE id = $1
                    `, [auction.id]);

                    await client.query('COMMIT');

                    console.log(`  🛡️ Auction #${auction.id} reserve not met or held by bot. Product returned to warehouse inventory (available).`);
                }

                await logActivity({
                    employeeId: 1,
                    employeeName: 'IRAQ BID Auction Settlement Service',
                    actionType: 'AUCTION_SETTLEMENT',
                    entityType: 'AUCTION',
                    entityId: auction.id,
                    details: {
                        product_id: auction.id,
                        title: auction.title,
                        highest_bid: auction.current_bid,
                        has_real_winner: hasValidWinner,
                        winner_id: auction.highest_bidder_id
                    }
                });

            } catch (error) {
                await client.query('ROLLBACK');
                console.error(`  ❌ Error processing auction ${auction.id}:`, error.message);
            } finally {
                client.release();
            }
        }
    } catch (error) {
        console.error('❌ Error in processEndedAuctions:', error.message);
    }
}

export default processEndedAuctions;
