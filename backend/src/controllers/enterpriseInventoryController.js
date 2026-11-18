import pool from "../config/db.js";
import { logActivity } from "../middleware/enterprisePermissions.js";
import { notifyAllUsersNewProduct } from "../utils/notificationUtils.js";

// ==========================================
// 1. INVENTORY MANAGEMENT CONTROLLER
// ==========================================

export const getInventoryStats = async (req, res) => {
  try {
    const statsQuery = `
      SELECT 
        COUNT(*) as total_registered,
        COUNT(*) FILTER (WHERE status = 'available') as available,
        COUNT(*) FILTER (WHERE status = 'in_auction') as in_auction,
        COUNT(*) FILTER (WHERE status = 'sold') as sold,
        COUNT(*) FILTER (WHERE status = 'delivered') as delivered,
        COUNT(*) FILTER (WHERE status = 'unsold') as unsold,
        COUNT(*) FILTER (WHERE status = 'damaged') as damaged,
        COUNT(*) FILTER (WHERE status = 'missing') as missing
      FROM inventory_items;
    `;
    const result = await pool.query(statsQuery);
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getAllInventory = async (req, res) => {
  try {
    const { status, condition, search, page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;

    let conditions = [];
    let params = [];

    if (status && status !== 'all') {
      params.push(status);
      conditions.push(`i.status = $${params.length}`);
    }

    if (condition) {
      params.push(condition);
      conditions.push(`i.condition = $${params.length}`);
    }

    if (search) {
      params.push(`%${search}%`);
      conditions.push(`(i.product_name ILIKE $${params.length} OR i.barcode ILIKE $${params.length} OR i.warehouse_location ILIKE $${params.length})`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const query = `
      SELECT i.*, COALESCE(u.name, u.email, 'Employee') as receiving_employee_name 
      FROM inventory_items i
      LEFT JOIN users u ON i.receiving_employee_id = u.id
      ${whereClause}
      ORDER BY i.created_at DESC
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `;

    params.push(limit, offset);
    const result = await pool.query(query, params);

    const countQuery = `
      SELECT COUNT(*) 
      FROM inventory_items i 
      LEFT JOIN users u ON i.receiving_employee_id = u.id 
      ${whereClause}
    `;
    const countResult = await pool.query(countQuery, params.slice(0, conditions.length));

    res.json({
      success: true,
      data: result.rows,
      pagination: {
        total: parseInt(countResult.rows[0].count),
        page: parseInt(page),
        limit: parseInt(limit)
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const registerProduct = async (req, res) => {
  try {
    const {
      barcode,
      product_name,
      description = '',
      images = [],
      original_retail_price,
      starting_bid_price,
      buy_now_price,
      min_acceptable_price,
      actual_acquisition_cost,
      auto_bid_increment = 1.00,
      condition = 'New',
      defect_alert = false,
      defect_details = '',
      defect_images = [],
      warehouse_location = 'Main Warehouse Slot A',
      category_id = null,
      notes = '',
      special_description = ''
    } = req.body;

    if (!barcode || !product_name || buy_now_price === undefined || starting_bid_price === undefined || original_retail_price === undefined) {
      return res.status(400).json({
        success: false,
        message: "Barcode, product name, original retail price, starting bid, and buy now price are mandatory."
      });
    }

    // Safe Numeric Parsing (Prevents PostgreSQL 'invalid input syntax for type numeric: ""')
    const parseNum = (val, defaultVal = null) => {
      if (val === null || val === undefined || val === '') return defaultVal;
      const parsed = parseFloat(val);
      return isNaN(parsed) ? defaultVal : parsed;
    };

    const numOriginalPrice = parseNum(original_retail_price, 0.00);
    const numStartingBid = parseNum(starting_bid_price, 0.00);
    const numBuyNow = parseNum(buy_now_price, 0.00);
    const numMinAcceptable = parseNum(min_acceptable_price, null);
    const numAcquisitionCost = parseNum(actual_acquisition_cost, null);
    const numIncrement = parseNum(auto_bid_increment, 1.00);
    const parsedCategoryId = category_id ? parseInt(category_id) : null;

    // Ensure images is an array of strings
    const imgArray = Array.isArray(images) ? images : (images ? [images] : []);
    const defectImgArray = Array.isArray(defect_images) ? defect_images : (defect_images ? [defect_images] : []);

    // Check duplicate barcode
    const existing = await pool.query("SELECT id FROM inventory_items WHERE barcode = $1", [barcode.trim()]);
    if (existing.rows.length > 0) {
      return res.status(400).json({ success: false, message: "Barcode already registered to another item!" });
    }

    const query = `
      INSERT INTO inventory_items (
        barcode, product_name, description, images, original_retail_price,
        starting_bid_price, buy_now_price, min_acceptable_price, actual_acquisition_cost,
        auto_bid_increment, condition, defect_alert, defect_details, defect_images,
        warehouse_location, receiving_employee_id, notes, status, category_id, special_description
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, 'available', $18, $19
      ) RETURNING *;
    `;

    const values = [
      barcode.trim(),
      product_name.trim(),
      description || '',
      imgArray,
      numOriginalPrice,
      numStartingBid,
      numBuyNow,
      numMinAcceptable,
      numAcquisitionCost,
      numIncrement,
      condition,
      Boolean(defect_alert),
      defect_details || '',
      defectImgArray,
      warehouse_location || 'Main Warehouse',
      req.user?.id || null,
      notes || '',
      parsedCategoryId,
      (special_description || '').trim()
    ];

    const result = await pool.query(query, values);
    const newItem = result.rows[0];

    // Mark barcode as assigned in barcode register if exists
    await pool.query("UPDATE barcodes SET status = 'assigned', assigned_item_id = $1 WHERE barcode_number = $2", [newItem.id, barcode.trim()]);

    // Product is saved to warehouse inventory with status = 'available'.
    // Admin manually reviews and publishes to live mobile auction when ready.

    await logActivity({
      employeeId: req.user?.id,
      employeeName: req.user?.name || req.user?.email || 'Admin',
      actionType: 'PRODUCT_REGISTRATION',
      entityType: 'INVENTORY_ITEM',
      entityId: newItem.id,
      newStatus: 'available',
      details: { barcode: barcode.trim(), product_name, buy_now_price: numBuyNow, imagesCount: imgArray.length }
    });

    res.status(201).json({
      success: true,
      message: "Physical warehouse product registered successfully! Available in inventory for review.",
      data: newItem
    });
  } catch (error) {
    console.error("registerProduct error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateInventoryItem = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const currentResult = await pool.query("SELECT * FROM inventory_items WHERE id = $1", [id]);
    if (currentResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Inventory item not found" });
    }
    const current = currentResult.rows[0];

    // Build dynamic update
    const allowed = [
      'product_name', 'description', 'images', 'original_retail_price',
      'starting_bid_price', 'buy_now_price', 'min_acceptable_price',
      'actual_acquisition_cost', 'auto_bid_increment', 'condition',
      'defect_alert', 'defect_details', 'defect_images', 'warehouse_location',
      'notes', 'status', 'special_description'
    ];

    const fields = [];
    const values = [];

    allowed.forEach(key => {
      if (updates[key] !== undefined) {
        values.push(updates[key]);
        fields.push(`${key} = $${values.length}`);
      }
    });

    if (fields.length === 0) {
      return res.status(400).json({ success: false, message: "No valid fields to update" });
    }

    values.push(id);
    const updateQuery = `
      UPDATE inventory_items 
      SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP 
      WHERE id = $${values.length} 
      RETURNING *;
    `;

    const result = await pool.query(updateQuery, values);
    const updated = result.rows[0];

    // If item is already published to live auction, sync changes to products table
    if (updated.published_product_id) {
      try {
        await pool.query(`
          UPDATE products 
          SET 
            title = COALESCE($1, title),
            description = COALESCE($2, description),
            original_retail_price = COALESCE($3, original_retail_price),
            real_price = COALESCE($3, real_price),
            buy_now_price = COALESCE($4, buy_now_price),
            starting_price = COALESCE($5, starting_price),
            starting_bid = COALESCE($5, starting_bid),
            condition = COALESCE($6, condition),
            special_description = COALESCE($7, special_description),
            updated_at = CURRENT_TIMESTAMP
          WHERE id = $8
        `, [
          updates.product_name,
          updates.description,
          updates.original_retail_price ? parseFloat(updates.original_retail_price) : null,
          updates.buy_now_price ? parseFloat(updates.buy_now_price) : null,
          updates.starting_bid_price ? parseFloat(updates.starting_bid_price) : null,
          updates.condition,
          updates.special_description,
          updated.published_product_id
        ]);
      } catch (syncErr) {
        console.error("Warning syncing updated inventory to product:", syncErr.message);
      }
    }

    await logActivity({
      employeeId: req.user?.id,
      employeeName: req.user?.full_name || 'Admin',
      actionType: 'PRODUCT_UPDATE',
      entityType: 'INVENTORY_ITEM',
      entityId: id,
      previousStatus: current.status,
      newStatus: updated.status,
      details: updates
    });

    res.json({ success: true, data: updated, message: "Inventory item updated successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ==========================================
// 2. BARCODE MANAGEMENT CONTROLLER
// ==========================================

export const generateBarcodes = async (req, res) => {
  try {
    const { quantity = 1 } = req.body;
    const qty = Math.min(Math.max(parseInt(quantity), 1), 5000);

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const seqRes = await client.query(
        "UPDATE barcode_sequences SET current_val = current_val + $1 WHERE prefix = 'IQB' RETURNING current_val",
        [qty]
      );
      const endVal = seqRes.rows[0].current_val;
      const startVal = endVal - qty + 1;

      const generatedBarcodes = [];
      for (let i = startVal; i <= endVal; i++) {
        const padded = String(i).padStart(6, '0');
        const code = `IQB-${padded}`;
        generatedBarcodes.push(code);
      }

      // Bulk insert
      const insertVals = [];
      const placeholders = [];
      generatedBarcodes.forEach((code, idx) => {
        const p = idx * 2;
        placeholders.push(`($${p + 1}, $${p + 2}, 'unused')`);
        insertVals.push(code, req.user?.id || null);
      });

      const insertSql = `
        INSERT INTO barcodes (barcode_number, created_by, status)
        VALUES ${placeholders.join(', ')}
        RETURNING barcode_number;
      `;
      await client.query(insertSql, insertVals);

      await client.query('COMMIT');

      await logActivity({
        employeeId: req.user?.id,
        employeeName: req.user?.full_name || 'Admin',
        actionType: 'BARCODE_GENERATION',
        entityType: 'BARCODE',
        entityId: `${startVal}-${endVal}`,
        details: { quantity: qty, sample: generatedBarcodes[0] }
      });

      res.status(201).json({
        success: true,
        count: qty,
        barcodes: generatedBarcodes,
        message: `${qty} sequential barcodes generated successfully!`
      });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const generateBarcodeRange = async (req, res) => {
  try {
    const { from_number, to_number } = req.body;
    const fromNum = parseInt(from_number);
    const toNum = parseInt(to_number);

    if (isNaN(fromNum) || isNaN(toNum)) {
      return res.status(400).json({ success: false, message: "Valid 'from_number' and 'to_number' are required." });
    }

    if (fromNum < 1 || toNum < 1) {
      return res.status(400).json({ success: false, message: "Barcode numbers must be positive integers." });
    }

    if (fromNum > toNum) {
      return res.status(400).json({ success: false, message: "'From Barcode Number' cannot be greater than 'To Barcode Number'." });
    }

    const totalToGenerate = toNum - fromNum + 1;
    if (totalToGenerate > 2000) {
      return res.status(400).json({ success: false, message: "Maximum 2,000 barcodes can be generated in a single range." });
    }

    // Build desired barcodes list
    const candidateCodes = [];
    for (let i = fromNum; i <= toNum; i++) {
      candidateCodes.push(`IQB-${String(i).padStart(6, '0')}`);
    }

    // Check existing barcodes in barcodes table or inventory_items
    const existingRes = await pool.query(
      "SELECT barcode_number FROM barcodes WHERE barcode_number = ANY($1)",
      [candidateCodes]
    );
    const existingSet = new Set(existingRes.rows.map(r => r.barcode_number));

    // Also check inventory_items directly in case any legacy items have that barcode
    const invRes = await pool.query(
      "SELECT barcode FROM inventory_items WHERE barcode = ANY($1)",
      [candidateCodes]
    );
    invRes.rows.forEach(r => existingSet.add(r.barcode));

    // Filter out duplicates (already assigned or generated)
    const newBarcodes = candidateCodes.filter(c => !existingSet.has(c));
    const skippedCount = candidateCodes.length - newBarcodes.length;

    if (newBarcodes.length === 0) {
      return res.status(200).json({
        success: true,
        count: 0,
        skipped_count: skippedCount,
        all_range_barcodes: candidateCodes,
        barcodes: candidateCodes, // Return all candidate codes so UI can print entire requested range
        message: `All ${candidateCodes.length} barcodes in range IQB-${String(fromNum).padStart(6, '0')} to IQB-${String(toNum).padStart(6, '0')} already exist. Ready to print.`,
      });
    }

    // Insert new unused barcodes in bulk
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const placeholders = [];
      const insertVals = [];
      newBarcodes.forEach((code, idx) => {
        const p = idx * 2;
        placeholders.push(`($${p + 1}, $${p + 2}, 'unused')`);
        insertVals.push(code, req.user?.id || null);
      });

      const insertSql = `
        INSERT INTO barcodes (barcode_number, created_by, status)
        VALUES ${placeholders.join(', ')}
        RETURNING barcode_number;
      `;
      await client.query(insertSql, insertVals);

      // Keep barcode_sequences aligned if this range extends beyond current_val
      await client.query(
        "UPDATE barcode_sequences SET current_val = GREATEST(current_val, $1) WHERE prefix = 'IQB'",
        [toNum]
      );

      await client.query('COMMIT');

      await logActivity({
        employeeId: req.user?.id,
        employeeName: req.user?.full_name || req.user?.name || 'Admin',
        actionType: 'BARCODE_RANGE_GENERATION',
        entityType: 'BARCODE',
        entityId: `${fromNum}-${toNum}`,
        details: { from_number: fromNum, to_number: toNum, generated: newBarcodes.length, skipped: skippedCount }
      });

      res.status(201).json({
        success: true,
        count: newBarcodes.length,
        skipped_count: skippedCount,
        all_range_barcodes: candidateCodes,
        barcodes: candidateCodes, // Return full candidate range so UI can immediately print entire range!
        newly_generated: newBarcodes,
        message: `Processed range: ${newBarcodes.length} newly created, ${skippedCount} existing. Total ${candidateCodes.length} barcodes ready to print.`
      });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getBarcodes = async (req, res) => {
  try {
    const { status, search, page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;

    let conditions = [];
    let params = [];

    if (status && status !== 'all') {
      params.push(status);
      conditions.push(`b.status = $${params.length}`);
    }

    if (search) {
      params.push(`%${search}%`);
      conditions.push(`b.barcode_number ILIKE $${params.length}`);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const query = `
      SELECT b.*, i.product_name, i.status as item_status
      FROM barcodes b
      LEFT JOIN inventory_items i ON b.assigned_item_id = i.id
      ${where}
      ORDER BY b.id DESC
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `;
    params.push(limit, offset);

    const result = await pool.query(query, params);
    const count = await pool.query(`SELECT COUNT(*) FROM barcodes b ${where}`, params.slice(0, conditions.length));

    res.json({
      success: true,
      data: result.rows,
      pagination: {
        total: parseInt(count.rows[0].count),
        page: parseInt(page),
        limit: parseInt(limit)
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const lookupBarcode = async (req, res) => {
  try {
    const { barcode } = req.params;
    const query = `
      SELECT i.*, b.status as barcode_status
      FROM barcodes b
      LEFT JOIN inventory_items i ON b.assigned_item_id = i.id
      WHERE b.barcode_number = $1
    `;
    const result = await pool.query(query, [barcode]);

    if (result.rows.length === 0) {
      // Check if it exists in inventory directly
      const itemQuery = await pool.query("SELECT * FROM inventory_items WHERE barcode = $1", [barcode]);
      if (itemQuery.rows.length > 0) {
        return res.json({ success: true, registered: true, item: itemQuery.rows[0] });
      }
      return res.status(404).json({ success: false, registered: false, message: "Barcode not found in system." });
    }

    res.json({
      success: true,
      registered: !!result.rows[0].id,
      barcode: barcode,
      status: result.rows[0].barcode_status,
      item: result.rows[0].id ? result.rows[0] : null
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

