import pool from "../config/db.js";
import { logActivity } from "../middleware/enterprisePermissions.js";
import { notifyAllUsersNewProduct } from "../utils/notificationUtils.js";

// ==========================================
// 3. AUCTION PUBLISHING & AUTO-BIDDER CONTROLLER
// ==========================================

export const publishToAuction = async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { inventory_id, duration_hours = 24, category_id } = req.body;
    let targetCatId = category_id;
    if (!targetCatId) {
      const firstCat = await client.query("SELECT id FROM categories ORDER BY id ASC LIMIT 1");
      targetCatId = firstCat.rows[0]?.id || 2;
    }

    const itemRes = await client.query("SELECT * FROM inventory_items WHERE id = $1 FOR UPDATE", [inventory_id]);
    if (itemRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, message: "Inventory item not found" });
    }

    const item = itemRes.rows[0];
    if (item.status !== 'available') {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, message: `Item cannot be published. Current status: ${item.status}` });
    }

    // Calculate end time
    const endTime = new Date(Date.now() + duration_hours * 60 * 60 * 1000);

    // Publish Without Starting: status = 'coming_soon', auction_end_time = NULL
    const productQuery = `
      INSERT INTO products (
        title, description, starting_price, current_price, starting_bid, current_bid, buy_now_price,
        image_url, images, category_id, status, auction_end_time,
        source_type, condition, defect_alert, defect_details, original_retail_price, real_price, special_description, product_source
      ) VALUES (
        $1, $2, $3, $3, $3, $3, $4,
        $5, $6, $7, 'coming_soon', NULL,
        'company', $8, $9, $10, $11, $11, $12, 'company'
      ) RETURNING id;
    `;

    const mainImage = item.images && item.images.length > 0 ? item.images[0] : '';
    const productRes = await client.query(productQuery, [
      item.product_name,
      item.description || '',
      item.starting_bid_price,
      item.buy_now_price,
      mainImage,
      JSON.stringify(item.images || []),
      item.category_id || targetCatId || 2,
      item.condition,
      item.defect_alert,
      item.defect_details,
      item.original_retail_price,
      (item.special_description || '').trim()
    ]);

    const publishedProductId = productRes.rows[0].id;

    // Update inventory item to coming_soon
    await client.query(
      "UPDATE inventory_items SET status = 'coming_soon', published_product_id = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2",
      [publishedProductId, inventory_id]
    );

    await client.query('COMMIT');

    await logActivity({
      employeeId: req.user?.id,
      employeeName: req.user?.full_name || 'Admin',
      actionType: 'AUCTION_PUBLISHED',
      entityType: 'INVENTORY_ITEM',
      entityId: inventory_id,
      previousStatus: 'available',
      newStatus: 'in_auction',
      details: { publishedProductId, endTime, startingBid: item.starting_bid_price }
    });

    // 📣 Send immediate broadcast notification to all app users
    notifyAllUsersNewProduct(
      `🔥 New Live Auction: ${item.product_name}`,
      `A new item "${item.product_name}" has just started live bidding! Tap to place your bid now.`,
      publishedProductId
    ).catch(err => console.error("Error broadcasting new auction notification:", err));

    res.json({
      success: true,
      message: "Product published as Coming Soon! Click 'Start Auction' when ready to begin bidding.",
      published_product_id: publishedProductId,
      status: 'coming_soon'
    });
  } catch (error) {
    await client.query('ROLLBACK');
    res.status(500).json({ success: false, message: error.message });
  } finally {
    client.release();
  }
};

export const startAuction = async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { inventory_id, duration_hours = 24 } = req.body;

    const invRes = await client.query("SELECT * FROM inventory_items WHERE id = $1 FOR UPDATE", [inventory_id]);
    if (invRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, message: "Inventory item not found" });
    }
    const item = invRes.rows[0];
    if (!item.published_product_id) {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, message: "Item must be published first" });
    }

    const endTime = new Date(Date.now() + duration_hours * 60 * 60 * 1000);

    await client.query(
      "UPDATE products SET status = 'approved', auction_end_time = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2",
      [endTime, item.published_product_id]
    );

    await client.query(
      "UPDATE inventory_items SET status = 'in_auction', updated_at = CURRENT_TIMESTAMP WHERE id = $1",
      [inventory_id]
    );

    await client.query('COMMIT');

    const io = req.app.get('io');
    if (io) {
      io.emit('auction_started', {
        productId: item.published_product_id,
        auction_end_time: endTime.toISOString(),
        status: 'approved'
      });
    }

    res.json({
      success: true,
      message: "Auction started! Countdown and bidding are now live.",
      published_product_id: item.published_product_id,
      auction_end_time: endTime
    });
  } catch (error) {
    await client.query('ROLLBACK');
    res.status(500).json({ success: false, message: error.message });
  } finally {
    client.release();
  }
};

/**
 * Manually unpublish / cancel an auction and return item to available warehouse stock
 */
export const unpublishAuction = async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { inventory_id } = req.body;

    const itemRes = await client.query("SELECT * FROM inventory_items WHERE id = $1 FOR UPDATE", [inventory_id]);
    if (itemRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, message: "Inventory item not found" });
    }

    const item = itemRes.rows[0];
    if (item.published_product_id) {
      await client.query(
        "UPDATE products SET status = 'cancelled', auction_end_time = NOW(), updated_at = CURRENT_TIMESTAMP WHERE id = $1",
        [item.published_product_id]
      );
    }

    await client.query(
      "UPDATE inventory_items SET status = 'available', published_product_id = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = $1",
      [inventory_id]
    );

    await client.query('COMMIT');

    await logActivity({
      employeeId: req.user?.id,
      employeeName: req.user?.full_name || req.user?.name || req.user?.email || 'Admin',
      actionType: 'AUCTION_UNPUBLISHED',
      entityType: 'INVENTORY_ITEM',
      entityId: inventory_id,
      previousStatus: 'in_auction',
      newStatus: 'available',
      details: { unpublishedProductId: item.published_product_id }
    });

    res.json({
      success: true,
      message: "Auction cancelled and unpublished successfully. Item returned to warehouse stock."
    });
  } catch (error) {
    await client.query('ROLLBACK');
    res.status(500).json({ success: false, message: error.message });
  } finally {
    client.release();
  }
};

/**
 * Auto-Bidder Evaluation Service
 * Evaluates auctions in the last 10 minutes and injects system bot bids if below min_acceptable_price
 */
export const runAutoBidderCycle = async () => {
  try {
    const now = new Date();
    const tenMinutesAhead = new Date(now.getTime() + 10 * 60 * 1000);

    // Find active auctions linked to warehouse inventory ending in <= 10 mins
    const query = `
      SELECT p.id as product_id, p.current_bid, p.total_bids, p.auction_end_time,
             i.id as inventory_id, i.min_acceptable_price, i.auto_bid_increment, i.buy_now_price
      FROM products p
      JOIN inventory_items i ON i.published_product_id = p.id
      WHERE (p.status = 'active' OR p.status = 'approved')
        AND p.auction_end_time <= $1
        AND p.auction_end_time > $2
        AND i.min_acceptable_price IS NOT NULL
        AND p.current_bid < i.min_acceptable_price;
    `;

    const res = await pool.query(query, [tenMinutesAhead, now]);
    const candidates = res.rows;

    for (const item of candidates) {
      const increment = parseFloat(item.auto_bid_increment) || 1.00;
      const nextBid = parseFloat(item.current_bid) + increment;

      // Ensure bot bid doesn't overshoot buy now price
      if (nextBid <= parseFloat(item.min_acceptable_price)) {
        // Place system bid
        await pool.query('BEGIN');
        
        // System bot user (fallback to id 1 or admin)
        const botUserId = 1;

        await pool.query(
          "INSERT INTO bids (product_id, user_id, amount, created_at) VALUES ($1, $2, $3, NOW())",
          [item.product_id, botUserId, nextBid]
        );

        await pool.query(
          "UPDATE products SET current_bid = $1, total_bids = total_bids + 1, highest_bidder_id = $2 WHERE id = $3",
          [nextBid, botUserId, item.product_id]
        );

        await pool.query(
          "INSERT INTO system_auto_bids (auction_id, inventory_item_id, system_bidder_id, bid_amount, min_acceptable_price, is_system_generated) VALUES ($1, $2, $3, $4, $5, TRUE)",
          [item.product_id, item.inventory_id, botUserId, nextBid, item.min_acceptable_price]
        );

        await pool.query('COMMIT');
        console.log(`🤖 Auto-bidder placed bid of $${nextBid} on auction #${item.product_id}`);
      }
    }
  } catch (err) {
    await pool.query('ROLLBACK').catch(() => {});
    console.error("Auto-bidder cycle error:", err.message);
  }
};

// ==========================================
// 4. ORDERS, LABELS & SHIPPING CONTROLLER
// ==========================================

export const getOrderDetailsWithLabel = async (req, res) => {
  try {
    const { id } = req.params;

    const query = `
      SELECT o.*, 
             COALESCE(u.name, u.email, 'Customer') as customer_name, u.phone as customer_phone, u.email as customer_email,
             u.governorate, u.area, u.address as full_address,
             p.title as product_name, p.image_url as product_image,
             i.barcode as item_barcode,
             l.exchange_rate, l.iqd_total, l.usd_total, l.printed_count, l.shipping_fee_usd
      FROM orders o
      JOIN users u ON o.buyer_id = u.id
      JOIN products p ON o.product_id = p.id
      LEFT JOIN inventory_items i ON o.inventory_item_id = i.id OR i.published_product_id = p.id
      LEFT JOIN customer_order_labels l ON l.order_id = o.id
      WHERE o.id = $1;
    `;

    const result = await pool.query(query, [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    const order = result.rows[0];

    // If label snapshot hasn't been created yet, calculate and persist with default 1 USD = 1,520 IQD
    if (!order.exchange_rate) {
      const exchangeRate = 1520.00;
      const usdTotal = parseFloat(order.amount) || 0.00;
      const shippingFee = parseFloat(order.shipping_cost) || 0.00;
      const finalUsd = usdTotal + shippingFee;
      const iqdTotal = Math.round(finalUsd * exchangeRate);

      const labelRes = await pool.query(`
        INSERT INTO customer_order_labels (order_id, usd_total, exchange_rate, iqd_total, shipping_fee_usd)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (order_id) DO UPDATE SET last_printed_at = NOW()
        RETURNING *;
      `, [order.id, finalUsd, exchangeRate, iqdTotal, shippingFee]);

      order.exchange_rate = exchangeRate;
      order.iqd_total = iqdTotal;
      order.usd_total = finalUsd;
      order.shipping_fee_usd = shippingFee;
    }

    res.json({ success: true, data: order });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateShippingStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      delivery_status,
      shipping_company,
      tracking_number,
      shipping_cost,
      expected_delivery_date,
      shipping_notes
    } = req.body;

    const currentOrder = await pool.query("SELECT * FROM orders WHERE id = $1", [id]);
    if (currentOrder.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }
    const current = currentOrder.rows[0];

    const query = `
      UPDATE orders
      SET delivery_status = COALESCE($1, delivery_status),
          shipping_company = COALESCE($2, shipping_company),
          tracking_number = COALESCE($3, tracking_number),
          shipping_cost = COALESCE($4, shipping_cost),
          expected_delivery_date = COALESCE($5, expected_delivery_date),
          shipping_notes = COALESCE($6, shipping_notes),
          responsible_employee_id = $7,
          updated_at = NOW()
      WHERE id = $8
      RETURNING *;
    `;

    const result = await pool.query(query, [
      delivery_status, shipping_company, tracking_number,
      shipping_cost, expected_delivery_date, shipping_notes,
      req.user?.id || null, id
    ]);

    await logActivity({
      employeeId: req.user?.id,
      employeeName: req.user?.full_name || 'Admin',
      actionType: 'SHIPPING_UPDATE',
      entityType: 'ORDER',
      entityId: id,
      previousStatus: current.delivery_status,
      newStatus: delivery_status,
      details: { tracking_number, shipping_company }
    });

    res.json({ success: true, message: "Order shipping updated successfully", data: result.rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ==========================================
// 5. CUSTOMER 3-STRIKE REFUSAL TRACKER & BAN
// ==========================================

export const recordCustomerRefusal = async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { order_id, reason, notes } = req.body;

    const orderRes = await client.query("SELECT * FROM orders WHERE id = $1", [order_id]);
    if (orderRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    const order = orderRes.rows[0];
    const customerId = order.buyer_id;

    // Check if refusal already recorded for this order
    const existingRefusal = await client.query("SELECT id FROM customer_refusals WHERE order_id = $1", [order_id]);
    if (existingRefusal.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, message: "Refusal already recorded for this order." });
    }

    // Insert refusal
    await client.query(`
      INSERT INTO customer_refusals (customer_id, order_id, recorded_by, reason, notes)
      VALUES ($1, $2, $3, $4, $5);
    `, [customerId, order_id, req.user?.id || null, reason, notes]);

    // Update refusal counter on user
    const userUpdate = await client.query(`
      UPDATE users 
      SET refusal_count = refusal_count + 1 
      WHERE id = $1 
      RETURNING refusal_count, name, email, phone;
    `, [customerId]);

    const refusalCount = userUpdate.rows[0].refusal_count;
    let autoBanned = false;

    // 3 Confirmed Refusals = AUTOMATIC BAN
    if (refusalCount >= 3) {
      autoBanned = true;
      await client.query(`
        UPDATE users 
        SET status = 'blocked', is_banned = TRUE, ban_reason = 'Automatic Ban: 3 Confirmed Delivery Refusals', banned_at = NOW()
        WHERE id = $1;
      `, [customerId]);
    }

    // Return inventory product back to available
    if (order.product_id) {
      await client.query(`
        UPDATE inventory_items 
        SET status = 'available', updated_at = NOW() 
        WHERE published_product_id = $1;
      `, [order.product_id]);
    }

    await client.query('COMMIT');

    await logActivity({
      employeeId: req.user?.id,
      employeeName: req.user?.full_name || 'Admin',
      actionType: autoBanned ? 'CUSTOMER_AUTO_BAN' : 'CUSTOMER_REFUSAL_RECORDED',
      entityType: 'CUSTOMER',
      entityId: customerId,
      newStatus: autoBanned ? 'banned' : 'active',
      details: { refusalCount, order_id, reason, autoBanned }
    });

    res.json({
      success: true,
      refusal_count: refusalCount,
      auto_banned: autoBanned,
      message: autoBanned 
        ? `Refusal recorded (${refusalCount}/3). Customer has reached 3 refusals and was AUTOMATICALLY BANNED.`
        : `Refusal recorded successfully. Customer refusal count: ${refusalCount}/3.`
    });
  } catch (error) {
    await client.query('ROLLBACK');
    res.status(500).json({ success: false, message: error.message });
  } finally {
    client.release();
  }
};

// ==========================================
// 6. CUSTOM EMPLOYEE PERMISSIONS CONTROLLER
// ==========================================

export const getEmployeePermissions = async (req, res) => {
  try {
    const { id } = req.params;
    const query = `
      SELECT p.*, u.full_name, u.phone, u.role, u.status
      FROM users u
      LEFT JOIN employee_permissions p ON u.id = p.employee_id
      WHERE u.id = $1;
    `;
    const result = await pool.query(query, [id]);
    res.json({ success: true, data: result.rows });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateEmployeePermissions = async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { employee_id, permissions } = req.body; // array of { module, can_view, can_create, can_edit, can_delete, can_approve }

    for (const perm of permissions) {
      const upsert = `
        INSERT INTO employee_permissions (employee_id, module, can_view, can_create, can_edit, can_delete, can_approve, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
        ON CONFLICT (employee_id, module) DO UPDATE SET
          can_view = EXCLUDED.can_view,
          can_create = EXCLUDED.can_create,
          can_edit = EXCLUDED.can_edit,
          can_delete = EXCLUDED.can_delete,
          can_approve = EXCLUDED.can_approve,
          updated_at = NOW();
      `;
      await client.query(upsert, [
        employee_id, perm.module,
        !!perm.can_view, !!perm.can_create, !!perm.can_edit,
        !!perm.can_delete, !!perm.can_approve
      ]);
    }

    await client.query('COMMIT');

    await logActivity({
      employeeId: req.user?.id,
      employeeName: req.user?.full_name || 'Admin',
      actionType: 'EMPLOYEE_PERMISSIONS_UPDATE',
      entityType: 'EMPLOYEE',
      entityId: employee_id,
      details: { updatedModulesCount: permissions.length }
    });

    res.json({ success: true, message: "Employee permissions updated successfully" });
  } catch (error) {
    await client.query('ROLLBACK');
    res.status(500).json({ success: false, message: error.message });
  } finally {
    client.release();
  }
};

