import pool from "../config/db.js";

// Ensure tables exist
export async function initCouponTables() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS coupons (
        id SERIAL PRIMARY KEY,
        influencer_name VARCHAR(255) NOT NULL,
        coupon_code VARCHAR(100) UNIQUE NOT NULL,
        discount_percentage NUMERIC(5, 2) NOT NULL,
        max_discount_amount NUMERIC(10, 2) DEFAULT NULL,
        expiry_date TIMESTAMP NULL,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS coupon_redemptions (
        id SERIAL PRIMARY KEY,
        coupon_id INTEGER REFERENCES coupons(id) ON DELETE CASCADE,
        coupon_code VARCHAR(100) NOT NULL,
        influencer_name VARCHAR(255) NOT NULL,
        user_id INTEGER NOT NULL,
        order_id INTEGER NULL,
        product_id INTEGER NULL,
        original_amount NUMERIC(10, 2) NOT NULL,
        discount_percentage NUMERIC(5, 2) NOT NULL,
        discount_amount NUMERIC(10, 2) NOT NULL,
        final_amount NUMERIC(10, 2) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Add coupon columns to orders table if they don't exist
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='coupon_code') THEN
          ALTER TABLE orders ADD COLUMN coupon_code VARCHAR(100) DEFAULT NULL;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='discount_amount') THEN
          ALTER TABLE orders ADD COLUMN discount_amount NUMERIC(10, 2) DEFAULT 0.00;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='original_amount') THEN
          ALTER TABLE orders ADD COLUMN original_amount NUMERIC(10, 2) DEFAULT NULL;
        END IF;
      END $$;
    `);
    console.log("✅ [Coupon System] Database tables initialized successfully.");
  } catch (err) {
    console.error("❌ [Coupon System] Error initializing coupon tables:", err.message);
  }
}

export const CouponController = {
  // ==========================================
  // 📱 MOBILE / BUYER APIS
  // ==========================================

  // POST /api/coupons/validate
  // Validate coupon and calculate discount preview
  async validateCoupon(req, res) {
    try {
      const { coupon_code, amount, product_id } = req.body;
      const userId = req.user?.id;

      if (!coupon_code || !coupon_code.trim()) {
        return res.status(400).json({
          success: false,
          message: "Coupon code is required"
        });
      }

      const cleanCode = coupon_code.trim().toUpperCase();
      const numAmount = parseFloat(amount);

      if (isNaN(numAmount) || numAmount <= 0) {
        return res.status(400).json({
          success: false,
          message: "Invalid original amount"
        });
      }

      // Check coupon existence
      const couponRes = await pool.query(
        `SELECT * FROM coupons WHERE UPPER(coupon_code) = $1`,
        [cleanCode]
      );

      if (couponRes.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Invalid coupon code"
        });
      }

      const coupon = couponRes.rows[0];

      if (!coupon.is_active) {
        return res.status(400).json({
          success: false,
          message: "This coupon is no longer active"
        });
      }

      if (coupon.expiry_date && new Date(coupon.expiry_date) < new Date()) {
        return res.status(400).json({
          success: false,
          message: "This coupon has expired"
        });
      }

      // Check if user already used this coupon on this product
      if (userId && product_id) {
        const usedRes = await pool.query(
          `SELECT id FROM coupon_redemptions WHERE user_id = $1 AND product_id = $2 AND UPPER(coupon_code) = $3`,
          [userId, product_id, cleanCode]
        );
        if (usedRes.rows.length > 0) {
          return res.status(400).json({
            success: false,
            message: "You have already used this coupon for this item"
          });
        }
      }

      // Calculate discount
      const discountPercent = parseFloat(coupon.discount_percentage);
      let discountAmount = parseFloat(((numAmount * discountPercent) / 100).toFixed(2));

      if (coupon.max_discount_amount && parseFloat(coupon.max_discount_amount) > 0) {
        const maxDisc = parseFloat(coupon.max_discount_amount);
        if (discountAmount > maxDisc) {
          discountAmount = maxDisc;
        }
      }

      const finalAmount = parseFloat((numAmount - discountAmount).toFixed(2));

      return res.json({
        success: true,
        message: "Coupon applied successfully!",
        data: {
          coupon_id: coupon.id,
          coupon_code: coupon.coupon_code,
          influencer_name: coupon.influencer_name,
          discount_percentage: discountPercent,
          original_amount: numAmount,
          discount_amount: discountAmount,
          final_amount: finalAmount
        }
      });
    } catch (error) {
      console.error("Error validating coupon:", error);
      res.status(500).json({
        success: false,
        message: "Failed to validate coupon"
      });
    }
  },

  // POST /api/coupons/apply
  // Apply coupon to an existing won auction order or product
  async applyCouponToOrder(req, res) {
    try {
      const { coupon_code, product_id, order_id } = req.body;
      const userId = req.user.id;

      if (!coupon_code) {
        return res.status(400).json({ success: false, message: "Coupon code is required" });
      }

      const cleanCode = coupon_code.trim().toUpperCase();

      // 1. Validate Coupon
      const couponRes = await pool.query(
        "SELECT * FROM coupons WHERE UPPER(coupon_code) = $1 AND is_active = true",
        [cleanCode]
      );
      if (couponRes.rows.length === 0) {
        return res.status(404).json({ success: false, message: "Invalid or inactive coupon" });
      }
      const coupon = couponRes.rows[0];

      if (coupon.expiry_date && new Date(coupon.expiry_date) < new Date()) {
        return res.status(400).json({ success: false, message: "Coupon has expired" });
      }

      // 2. Locate the Order or Product
      let targetOrder = null;
      if (order_id) {
        const oRes = await pool.query(
          "SELECT * FROM orders WHERE id = $1 AND buyer_id = $2",
          [order_id, userId]
        );
        targetOrder = oRes.rows[0];
      } else if (product_id) {
        const oRes = await pool.query(
          "SELECT * FROM orders WHERE product_id = $1 AND buyer_id = $2 ORDER BY id DESC LIMIT 1",
          [product_id, userId]
        );
        targetOrder = oRes.rows[0];
      }

      let originalAmount = 0;
      let finalPrice = 0;
      let targetOrderId = targetOrder ? targetOrder.id : null;
      let targetProductId = product_id || (targetOrder ? targetOrder.product_id : null);

      if (targetOrder) {
        // Enforce: coupons can only be applied BEFORE shipping / delivery
        const deliveryStatus = (targetOrder.delivery_status || targetOrder.status || '').toLowerCase();
        if (deliveryStatus === 'delivered' || deliveryStatus === 'completed') {
          return res.status(400).json({
            success: false,
            message: "Coupons cannot be applied to delivered orders"
          });
        }
        if (targetOrder.coupon_code) {
          return res.status(400).json({
            success: false,
            message: `Coupon ${targetOrder.coupon_code} has already been applied to this order`
          });
        }
        originalAmount = parseFloat(targetOrder.original_amount || targetOrder.amount || targetOrder.final_price);
      } else if (product_id) {
        // Look up highest bid on product
        const pRes = await pool.query(
          "SELECT current_bid, starting_bid, highest_bidder_id, seller_id FROM products WHERE id = $1",
          [product_id]
        );
        if (pRes.rows.length === 0) {
          return res.status(404).json({ success: false, message: "Product not found" });
        }
        if (pRes.rows[0].highest_bidder_id !== userId) {
          return res.status(403).json({ success: false, message: "You did not win this product" });
        }
        originalAmount = parseFloat(pRes.rows[0].current_bid || pRes.rows[0].starting_bid || 0);

        // If no order exists yet, create one in pending state
        const discountPercent = parseFloat(coupon.discount_percentage);
        let discountAmount = parseFloat(((originalAmount * discountPercent) / 100).toFixed(2));
        if (coupon.max_discount_amount && parseFloat(coupon.max_discount_amount) > 0) {
          const maxDisc = parseFloat(coupon.max_discount_amount);
          if (discountAmount > maxDisc) discountAmount = maxDisc;
        }
        finalPrice = parseFloat((originalAmount - discountAmount).toFixed(2));

        const orderNumber = 'ORD-' + Date.now().toString().slice(-6) + Math.floor(100 + Math.random() * 900);
        const orderRes = await pool.query(`
          INSERT INTO orders (
            order_number, product_id, buyer_id, seller_id, amount, final_price, original_amount,
            discount_amount, coupon_code, shipping_cost, status, payment_status, delivery_status, created_at
          ) VALUES (
            $1, $2, $3, $4, $5, $5, $6, $7, $8, 0, 'pending', 'pending', 'pending', CURRENT_TIMESTAMP
          ) RETURNING *;
        `, [
          orderNumber,
          product_id,
          userId,
          pRes.rows[0].seller_id || 8,
          finalPrice,
          originalAmount,
          discountAmount,
          coupon.coupon_code
        ]);
        targetOrderId = orderRes.rows[0].id;
      } else {
        return res.status(400).json({ success: false, message: "Product or Order ID required" });
      }

      // Check redemption duplicate
      const redCheck = await pool.query(
        "SELECT id FROM coupon_redemptions WHERE user_id = $1 AND (product_id = $2 OR order_id = $3)",
        [userId, targetProductId, targetOrderId]
      );
      if (redCheck.rows.length > 0) {
        return res.status(400).json({ success: false, message: "A coupon has already been used for this item" });
      }

      // Calculate Discount
      const discountPercent = parseFloat(coupon.discount_percentage);
      let discountAmount = parseFloat(((originalAmount * discountPercent) / 100).toFixed(2));
      if (coupon.max_discount_amount && parseFloat(coupon.max_discount_amount) > 0) {
        const maxDisc = parseFloat(coupon.max_discount_amount);
        if (discountAmount > maxDisc) discountAmount = maxDisc;
      }
      finalPrice = parseFloat((originalAmount - discountAmount).toFixed(2));

      // Record Redemption
      await pool.query(`
        INSERT INTO coupon_redemptions (
          coupon_id, coupon_code, influencer_name, user_id, order_id, product_id,
          original_amount, discount_percentage, discount_amount, final_amount, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, CURRENT_TIMESTAMP)
      `, [
        coupon.id,
        coupon.coupon_code,
        coupon.influencer_name,
        userId,
        targetOrderId,
        targetProductId,
        originalAmount,
        discountPercent,
        discountAmount,
        finalPrice
      ]);

      // Update Order if exists
      if (targetOrderId) {
        await pool.query(`
          UPDATE orders
          SET coupon_code = $1,
              original_amount = $2,
              discount_amount = $3,
              final_price = $4,
              amount = $4
          WHERE id = $5
        `, [coupon.coupon_code, originalAmount, discountAmount, finalPrice, targetOrderId]);
      }

      return res.json({
        success: true,
        message: `Coupon ${coupon.coupon_code} applied! You saved $${discountAmount}`,
        data: {
          coupon_code: coupon.coupon_code,
          influencer_name: coupon.influencer_name,
          discount_percentage: discountPercent,
          original_amount: originalAmount,
          discount_amount: discountAmount,
          final_price: finalPrice
        }
      });
    } catch (error) {
      console.error("Error applying coupon to order:", error);
      res.status(500).json({ success: false, message: error.message || "Failed to apply coupon" });
    }
  },

  // ==========================================
  // 🖥️ ADMIN PANEL APIS
  // ==========================================

  // GET /api/admin/coupons
  // List all influencer coupons with aggregated usage statistics
  async getAdminCoupons(req, res) {
    try {
      const query = `
        SELECT 
          c.*,
          COALESCE(COUNT(r.id), 0)::integer as total_uses,
          COALESCE(COUNT(DISTINCT r.user_id), 0)::integer as unique_customers,
          COALESCE(SUM(r.original_amount), 0)::numeric as total_original_sales,
          COALESCE(SUM(r.discount_amount), 0)::numeric as total_discounts_given,
          COALESCE(SUM(r.final_amount), 0)::numeric as total_final_sales
        FROM coupons c
        LEFT JOIN coupon_redemptions r ON c.id = r.coupon_id
        GROUP BY c.id
        ORDER BY c.created_at DESC
      `;
      const result = await pool.query(query);
      return res.json({
        success: true,
        data: result.rows
      });
    } catch (error) {
      console.error("Error in getAdminCoupons:", error);
      res.status(500).json({ success: false, message: error.message });
    }
  },

  // POST /api/admin/coupons
  // Create a new influencer coupon
  async createCoupon(req, res) {
    try {
      const {
        influencer_name,
        coupon_code,
        discount_percentage,
        max_discount_amount,
        expiry_date,
        is_active = true
      } = req.body;

      if (!influencer_name || !coupon_code || discount_percentage === undefined) {
        return res.status(400).json({
          success: false,
          message: "Influencer Name, Coupon Code, and Discount Percentage are required"
        });
      }

      const cleanCode = coupon_code.trim().toUpperCase();

      // Check unique code
      const existCheck = await pool.query(
        "SELECT id FROM coupons WHERE UPPER(coupon_code) = $1",
        [cleanCode]
      );
      if (existCheck.rows.length > 0) {
        return res.status(400).json({
          success: false,
          message: `Coupon code '${cleanCode}' already exists. Please choose a unique code.`
        });
      }

      const insertRes = await pool.query(`
        INSERT INTO coupons (
          influencer_name, coupon_code, discount_percentage, max_discount_amount, expiry_date, is_active, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        RETURNING *
      `, [
        influencer_name.trim(),
        cleanCode,
        parseFloat(discount_percentage),
        max_discount_amount ? parseFloat(max_discount_amount) : null,
        expiry_date ? new Date(expiry_date) : null,
        Boolean(is_active)
      ]);

      return res.json({
        success: true,
        message: "Influencer coupon created successfully",
        data: insertRes.rows[0]
      });
    } catch (error) {
      console.error("Error creating coupon:", error);
      res.status(500).json({ success: false, message: error.message });
    }
  },

  // PUT /api/admin/coupons/:id
  // Update coupon details or active status
  async updateCoupon(req, res) {
    try {
      const { id } = req.params;
      const {
        influencer_name,
        coupon_code,
        discount_percentage,
        max_discount_amount,
        expiry_date,
        is_active
      } = req.body;

      const existingRes = await pool.query("SELECT * FROM coupons WHERE id = $1", [id]);
      if (existingRes.rows.length === 0) {
        return res.status(404).json({ success: false, message: "Coupon not found" });
      }

      const current = existingRes.rows[0];
      const newCode = coupon_code ? coupon_code.trim().toUpperCase() : current.coupon_code;

      if (newCode !== current.coupon_code) {
        const check = await pool.query("SELECT id FROM coupons WHERE UPPER(coupon_code) = $1 AND id != $2", [newCode, id]);
        if (check.rows.length > 0) {
          return res.status(400).json({ success: false, message: "Coupon code is already taken by another influencer" });
        }
      }

      const updateRes = await pool.query(`
        UPDATE coupons
        SET influencer_name = $1,
            coupon_code = $2,
            discount_percentage = $3,
            max_discount_amount = $4,
            expiry_date = $5,
            is_active = $6,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $7
        RETURNING *
      `, [
        influencer_name ? influencer_name.trim() : current.influencer_name,
        newCode,
        discount_percentage !== undefined ? parseFloat(discount_percentage) : current.discount_percentage,
        max_discount_amount !== undefined ? (max_discount_amount ? parseFloat(max_discount_amount) : null) : current.max_discount_amount,
        expiry_date !== undefined ? (expiry_date ? new Date(expiry_date) : null) : current.expiry_date,
        is_active !== undefined ? Boolean(is_active) : current.is_active,
        id
      ]);

      return res.json({
        success: true,
        message: "Coupon updated successfully",
        data: updateRes.rows[0]
      });
    } catch (error) {
      console.error("Error updating coupon:", error);
      res.status(500).json({ success: false, message: error.message });
    }
  },

  // DELETE /api/admin/coupons/:id
  async deleteCoupon(req, res) {
    try {
      const { id } = req.params;
      await pool.query("DELETE FROM coupons WHERE id = $1", [id]);
      return res.json({
        success: true,
        message: "Coupon deleted successfully"
      });
    } catch (error) {
      console.error("Error deleting coupon:", error);
      res.status(500).json({ success: false, message: error.message });
    }
  },

  // GET /api/admin/coupons/transactions
  // Detailed audit trail of all orders where a coupon was used
  async getCouponTransactions(req, res) {
    try {
      const { search, coupon_id, start_date, end_date } = req.query;

      let query = `
        SELECT 
          r.id,
          r.coupon_id,
          r.coupon_code,
          r.influencer_name,
          r.original_amount,
          r.discount_percentage,
          r.discount_amount,
          r.final_amount,
          r.created_at,
          u.name as customer_name,
          u.phone as customer_phone,
          p.title as product_name,
          p.image_url as product_image,
          COALESCE(o.delivery_status, o.status, 'pending') as order_status,
          o.order_number
        FROM coupon_redemptions r
        LEFT JOIN users u ON r.user_id = u.id
        LEFT JOIN products p ON r.product_id = p.id
        LEFT JOIN orders o ON r.order_id = o.id OR (r.product_id = o.product_id AND r.user_id = o.buyer_id)
        WHERE 1=1
      `;
      const params = [];
      let count = 1;

      if (coupon_id) {
        query += ` AND r.coupon_id = $${count++}`;
        params.push(parseInt(coupon_id));
      }

      if (search) {
        query += ` AND (
          r.coupon_code ILIKE $${count} OR 
          r.influencer_name ILIKE $${count} OR 
          u.name ILIKE $${count} OR 
          p.title ILIKE $${count}
        )`;
        params.push(`%${search}%`);
        count++;
      }

      if (start_date) {
        query += ` AND r.created_at >= $${count++}`;
        params.push(new Date(start_date));
      }

      if (end_date) {
        query += ` AND r.created_at <= $${count++}`;
        params.push(new Date(end_date));
      }

      query += ` ORDER BY r.created_at DESC LIMIT 100`;

      const result = await pool.query(query, params);
      return res.json({
        success: true,
        data: result.rows
      });
    } catch (error) {
      console.error("Error in getCouponTransactions:", error);
      res.status(500).json({ success: false, message: error.message });
    }
  },

  // GET /api/admin/coupons/performance
  // Influencer Leaderboard comparing sales, discounts, and total uses with date range
  async getInfluencerPerformance(req, res) {
    try {
      const { start_date, end_date, sort_by = "total_uses" } = req.query;

      let dateFilter = "";
      const params = [];
      let count = 1;

      if (start_date) {
        dateFilter += ` AND r.created_at >= $${count++}`;
        params.push(new Date(start_date));
      }
      if (end_date) {
        dateFilter += ` AND r.created_at <= $${count++}`;
        params.push(new Date(end_date));
      }

      let orderClause = "ORDER BY total_uses DESC";
      if (sort_by === "total_sales") orderClause = "ORDER BY total_sales_after_discount DESC";
      if (sort_by === "total_discount") orderClause = "ORDER BY total_discounts_given DESC";
      if (sort_by === "name") orderClause = "ORDER BY c.influencer_name ASC";

      const query = `
        SELECT 
          c.id as coupon_id,
          c.influencer_name,
          c.coupon_code,
          c.discount_percentage,
          c.is_active,
          COALESCE(COUNT(r.id), 0)::integer as total_uses,
          COALESCE(COUNT(DISTINCT r.user_id), 0)::integer as unique_customers,
          COALESCE(SUM(r.original_amount), 0)::numeric as total_sales_before_discount,
          COALESCE(SUM(r.discount_amount), 0)::numeric as total_discounts_given,
          COALESCE(SUM(r.final_amount), 0)::numeric as total_sales_after_discount
        FROM coupons c
        LEFT JOIN coupon_redemptions r ON c.id = r.coupon_id ${dateFilter}
        GROUP BY c.id
        ${orderClause}
      `;

      const result = await pool.query(query, params);
      return res.json({
        success: true,
        data: result.rows
      });
    } catch (error) {
      console.error("Error in getInfluencerPerformance:", error);
      res.status(500).json({ success: false, message: error.message });
    }
  }
};
