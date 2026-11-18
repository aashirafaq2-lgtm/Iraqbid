import pool from "../config/db.js";

// Initialize tables for Special Bidders and Special Bids Audit Log
export async function initSpecialBidderTables() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS special_bidders (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        unique_id VARCHAR(100) UNIQUE NOT NULL,
        is_active BOOLEAN DEFAULT true,
        created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS special_bids_log (
        id SERIAL PRIMARY KEY,
        special_bidder_id INTEGER REFERENCES special_bidders(id) ON DELETE SET NULL,
        special_bidder_name VARCHAR(255) NOT NULL,
        special_bidder_code VARCHAR(100) NOT NULL,
        product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
        product_title VARCHAR(255),
        bid_amount NUMERIC(10, 2) NOT NULL,
        employee_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        employee_name VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Ensure bids table has flag for staff/special bidder identification if requested
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='bids' AND column_name='is_special_bid') THEN
          ALTER TABLE bids ADD COLUMN is_special_bid BOOLEAN DEFAULT FALSE;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='bids' AND column_name='special_bidder_id') THEN
          ALTER TABLE bids ADD COLUMN special_bidder_id INTEGER DEFAULT NULL;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='bids' AND column_name='special_bidder_name') THEN
          ALTER TABLE bids ADD COLUMN special_bidder_name VARCHAR(255) DEFAULT NULL;
        END IF;
      END $$;
    `);

    // Insert initial default profiles if none exist
    const countRes = await pool.query("SELECT COUNT(*) FROM special_bidders");
    if (parseInt(countRes.rows[0].count) === 0) {
      await pool.query(`
        INSERT INTO special_bidders (name, unique_id, is_active)
        VALUES 
          ('Bidder 1', 'SB-001', true),
          ('Bidder 2', 'SB-002', true),
          ('Bidder 3', 'SB-003', true),
          ('Bidder 4', 'SB-004', true),
          ('Bidder 5', 'SB-005', true)
        ON CONFLICT (unique_id) DO NOTHING;
      `);
      console.log('✅ Default Special Bidders seeded (Bidder 1 to 5)');
    }

    console.log('✅ Special Bidder tables verified/initialized');
  } catch (err) {
    console.error('❌ Error initializing Special Bidder tables:', err.message);
  }
}

// 1. Get all special bidder profiles with usage stats
export const getSpecialBidders = async (req, res) => {
  try {
    const query = `
      SELECT 
        sb.id,
        sb.name,
        sb.unique_id,
        sb.is_active,
        sb.created_at,
        sb.updated_at,
        u.name as creator_name,
        COUNT(sbl.id)::int as total_bids_placed,
        COALESCE(MAX(sbl.bid_amount), 0) as max_bid_placed,
        MAX(sbl.created_at) as last_bid_placed_at
      FROM special_bidders sb
      LEFT JOIN users u ON sb.created_by = u.id
      LEFT JOIN special_bids_log sbl ON sb.id = sbl.special_bidder_id
      GROUP BY sb.id, u.name
      ORDER BY sb.id ASC;
    `;
    const result = await pool.query(query);
    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('Error fetching special bidders:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// 2. Create a new special bidder profile
export const createSpecialBidder = async (req, res) => {
  try {
    const { name, unique_id, is_active } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Bidder name is required' });
    }

    // Generate unique ID if not provided
    let finalUniqueId = unique_id ? unique_id.trim().toUpperCase() : null;
    if (!finalUniqueId) {
      const randomSuffix = Math.floor(1000 + Math.random() * 9000);
      finalUniqueId = `SB-${randomSuffix}`;
    }

    // Check unique ID conflict
    const existCheck = await pool.query(
      "SELECT id FROM special_bidders WHERE unique_id = $1",
      [finalUniqueId]
    );
    if (existCheck.rows.length > 0) {
      return res.status(400).json({ success: false, message: 'A special bidder profile with this Unique ID already exists' });
    }

    const employeeId = req.user?.id || 1;
    const insertRes = await pool.query(
      `INSERT INTO special_bidders (name, unique_id, is_active, created_by)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [name.trim(), finalUniqueId, is_active !== false, employeeId]
    );

    res.status(201).json({
      success: true,
      message: 'Special bidder profile created successfully',
      data: insertRes.rows[0]
    });
  } catch (err) {
    console.error('Error creating special bidder:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// 3. Update / Edit a special bidder profile
export const updateSpecialBidder = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, unique_id, is_active } = req.body;

    const exist = await pool.query("SELECT * FROM special_bidders WHERE id = $1", [id]);
    if (exist.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Special bidder profile not found' });
    }

    // Unique ID collision check
    if (unique_id && unique_id.trim().toUpperCase() !== exist.rows[0].unique_id) {
      const collision = await pool.query(
        "SELECT id FROM special_bidders WHERE unique_id = $1 AND id != $2",
        [unique_id.trim().toUpperCase(), id]
      );
      if (collision.rows.length > 0) {
        return res.status(400).json({ success: false, message: 'Unique ID already in use by another profile' });
      }
    }

    const updateRes = await pool.query(
      `UPDATE special_bidders
       SET name = COALESCE($1, name),
           unique_id = COALESCE($2, unique_id),
           is_active = COALESCE($3, is_active),
           updated_at = NOW()
       WHERE id = $4
       RETURNING *`,
      [
        name ? name.trim() : null,
        unique_id ? unique_id.trim().toUpperCase() : null,
        typeof is_active === 'boolean' ? is_active : null,
        id
      ]
    );

    res.json({
      success: true,
      message: 'Special bidder profile updated successfully',
      data: updateRes.rows[0]
    });
  } catch (err) {
    console.error('Error updating special bidder:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// 4. Delete a special bidder profile
export const deleteSpecialBidder = async (req, res) => {
  try {
    const { id } = req.params;
    const delRes = await pool.query("DELETE FROM special_bidders WHERE id = $1 RETURNING *", [id]);
    if (delRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Special bidder profile not found' });
    }
    res.json({ success: true, message: 'Special bidder profile deleted successfully' });
  } catch (err) {
    console.error('Error deleting special bidder:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// 5. Place bid as a Special Bidder from Admin Panel
export const placeSpecialBid = async (req, res) => {
  const client = await pool.connect();
  try {
    const { special_bidder_id, product_id, bid_amount } = req.body;
    const employeeId = req.user?.id || 1;
    const employeeName = req.user?.full_name || req.user?.name || 'Authorized Staff';

    if (!special_bidder_id) {
      return res.status(400).json({ success: false, message: 'Special Bidder profile must be selected' });
    }
    if (!product_id) {
      return res.status(400).json({ success: false, message: 'Product must be selected' });
    }
    const amountNum = parseFloat(bid_amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      return res.status(400).json({ success: false, message: 'A valid bid amount greater than 0 is required' });
    }

    // Validate special bidder exists and is active
    const bidderRes = await client.query(
      "SELECT * FROM special_bidders WHERE id = $1",
      [special_bidder_id]
    );
    if (bidderRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Special bidder profile not found' });
    }
    const bidderProfile = bidderRes.rows[0];
    if (!bidderProfile.is_active) {
      return res.status(400).json({ success: false, message: `Special Bidder profile "${bidderProfile.name}" is inactive` });
    }

    await client.query('BEGIN');

    // Lock product row for atomic update
    const productRes = await client.query(
      "SELECT * FROM products WHERE id = $1 FOR UPDATE",
      [product_id]
    );
    if (productRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, message: 'Product not found' });
    }
    const product = productRes.rows[0];

    // Check auction validity
    if (product.status !== 'approved' && product.status !== 'active') {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, message: `Product auction is not active (status: ${product.status})` });
    }

    const now = new Date();
    if (product.auction_end_time && new Date(product.auction_end_time) <= now) {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, message: 'Auction has already ended for this product' });
    }

    const currentBid = parseFloat(product.current_bid) || parseFloat(product.starting_bid) || 0;
    if (amountNum <= currentBid) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: `Bid must be strictly higher than current highest bid ($${currentBid})`
      });
    }

    // Insert bid into bids table
    // user_id references employee or admin user, with special bidder tagged
    const insertBid = await client.query(
      `INSERT INTO bids (product_id, user_id, amount, is_special_bid, special_bidder_id, special_bidder_name, created_at)
       VALUES ($1, $2, $3, TRUE, $4, $5, NOW())
       RETURNING *`,
      [product.id, employeeId, amountNum, bidderProfile.id, bidderProfile.name]
    );

    // Update product
    await client.query(
      `UPDATE products
       SET current_bid = $1,
           current_price = $1,
           highest_bidder_id = $2,
           total_bids = COALESCE(total_bids, 0) + 1,
           updated_at = NOW()
       WHERE id = $3`,
      [amountNum, employeeId, product.id]
    );

    // Insert into audit trail
    const auditRes = await client.query(
      `INSERT INTO special_bids_log 
       (special_bidder_id, special_bidder_name, special_bidder_code, product_id, product_title, bid_amount, employee_id, employee_name, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
       RETURNING *`,
      [
        bidderProfile.id,
        bidderProfile.name,
        bidderProfile.unique_id,
        product.id,
        product.title,
        amountNum,
        employeeId,
        employeeName
      ]
    );

    await client.query('COMMIT');

    // Real-time broadcast via Socket.IO
    try {
      const io = req.app.get('io');
      if (io) {
        const updateData = {
          productId: product.id,
          currentPrice: amountNum,
          totalBids: (parseInt(product.total_bids) || 0) + 1,
          lastBidderName: bidderProfile.name, // Clearly displays the special bidder profile name
          isSpecialBid: true,
          timestamp: new Date().toISOString()
        };
        io.to(`product_${product.id}`).emit('bid_updated', updateData);
        io.emit('bid_updated', updateData);
      }
    } catch (sockErr) {
      console.warn('Socket emit error for special bid:', sockErr.message);
    }

    res.status(201).json({
      success: true,
      message: `Successfully placed bid of $${amountNum} as ${bidderProfile.name}!`,
      data: {
        bid: insertBid.rows[0],
        audit: auditRes.rows[0],
        current_bid: amountNum,
        product_id: product.id
      }
    });

  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('Error placing special bid:', err);
    res.status(500).json({ success: false, message: err.message });
  } finally {
    client.release();
  }
};

// 6. Get Special Bids Audit Log
export const getSpecialBidsHistory = async (req, res) => {
  try {
    const { product_id, bidder_id, limit = 100 } = req.query;
    let query = `
      SELECT 
        sbl.*,
        p.image_url as product_image
      FROM special_bids_log sbl
      LEFT JOIN products p ON sbl.product_id = p.id
      WHERE 1=1
    `;
    const params = [];

    if (product_id) {
      params.push(product_id);
      query += ` AND sbl.product_id = $${params.length}`;
    }
    if (bidder_id) {
      params.push(bidder_id);
      query += ` AND sbl.special_bidder_id = $${params.length}`;
    }

    query += ` ORDER BY sbl.created_at DESC LIMIT $${params.length + 1}`;
    params.push(parseInt(limit));

    const result = await pool.query(query, params);
    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('Error fetching special bids history:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};
