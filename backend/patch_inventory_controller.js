import fs from 'fs';

const filePath = 'e:/Ahmed work/iraq-bid-app-master/backend/src/controllers/enterpriseInventoryController.js';
let code = fs.readFileSync(filePath, 'utf8');

// Replace registerProduct sanitization
const targetFuncStart = 'export const registerProduct = async (req, res) => {';
const targetStartIdx = code.indexOf(targetFuncStart);

if (targetStartIdx === -1) {
  console.error('Target not found!');
  process.exit(1);
}

const endOfFunc = code.indexOf('export const updateInventoryItem =', targetStartIdx);

const newRegisterProductCode = `export const registerProduct = async (req, res) => {
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
      notes = ''
    } = req.body;

    if (!barcode || !product_name || buy_now_price === undefined || starting_bid_price === undefined || original_retail_price === undefined) {
      return res.status(400).json({
        success: false,
        message: "Barcode, product name, original retail price, starting bid, and buy now price are mandatory."
      });
    }

    // Safe Numeric Parsing (Prevents PostgreSQL 'invalid input syntax for type numeric: \"\"')
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

    // Ensure images is an array of strings
    const imgArray = Array.isArray(images) ? images : (images ? [images] : []);
    const defectImgArray = Array.isArray(defect_images) ? defect_images : (defect_images ? [defect_images] : []);

    // Check duplicate barcode
    const existing = await pool.query("SELECT id FROM inventory_items WHERE barcode = $1", [barcode.trim()]);
    if (existing.rows.length > 0) {
      return res.status(400).json({ success: false, message: "Barcode already registered to another item!" });
    }

    const query = \`
      INSERT INTO inventory_items (
        barcode, product_name, description, images, original_retail_price,
        starting_bid_price, buy_now_price, min_acceptable_price, actual_acquisition_cost,
        auto_bid_increment, condition, defect_alert, defect_details, defect_images,
        warehouse_location, receiving_employee_id, notes, status
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, 'available'
      ) RETURNING *;
    \`;

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
      notes || ''
    ];

    const result = await pool.query(query, values);
    const newItem = result.rows[0];

    // Mark barcode as assigned in barcode register if exists
    await pool.query("UPDATE barcodes SET status = 'assigned', assigned_item_id = $1 WHERE barcode_number = $2", [newItem.id, barcode.trim()]);

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
      message: "Physical warehouse product registered successfully!",
      data: newItem
    });
  } catch (error) {
    console.error("registerProduct error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

`;

code = code.slice(0, targetStartIdx) + newRegisterProductCode + code.slice(endOfFunc);
fs.writeFileSync(filePath, code, 'utf8');
console.log('Successfully patched enterpriseInventoryController.js with bulletproof numeric & image handling!');

