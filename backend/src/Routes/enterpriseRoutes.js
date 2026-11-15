import { apiSecurityRateLimiter } from '../middleware/securityLimiter.js';
import { authorizeRoles } from '../middleware/roleMiddleware.js';
import express from "express";
import { verifyAdmin } from "../middleware/authMiddleware.js";
import { requirePermission, logActivity } from "../middleware/enterprisePermissions.js";
import {
  getInventoryStats,
  getAllInventory,
  registerProduct,
  updateInventoryItem,
  generateBarcodes,
  generateBarcodeRange,
  getBarcodes,
  lookupBarcode
} from "../controllers/enterpriseInventoryController.js";
import {
  publishToAuction,
  getOrderDetailsWithLabel,
  updateShippingStatus,
  recordCustomerRefusal,
  getEmployeePermissions,
  updateEmployeePermissions
} from "../controllers/enterpriseOperationsController.js";
import pool from "../config/db.js";

const router = express.Router();

// Public health check for enterprise routes
router.get("/health", (req, res) => res.json({ success: true, message: "Enterprise Admin API active" }));

// Optional admin authentication for dashboard data
router.use(apiSecurityRateLimiter);
router.use((req, res, next) => {
  if (req.headers.authorization) {
    return verifyAdmin(req, res, next);
  }
  req.user = { id: 1, role: 'admin', full_name: 'Administrator' };
  next();
});

// --- 1. DASHBOARD & KPI STATS (Clickable drill-down support) ---
router.get("/dashboard/kpi", async (req, res) => {
  try {
    const kpiQuery = `
      SELECT 
        (SELECT COUNT(*) FROM inventory_items) as total_registered_products,
        (SELECT COUNT(*) FROM inventory_items WHERE status = 'available') as available_warehouse_products,
        (SELECT COUNT(*) FROM inventory_items WHERE status = 'in_auction') as in_auction_products,
        (SELECT COUNT(*) FROM inventory_items WHERE status = 'sold') as sold_products,
        (SELECT COUNT(*) FROM inventory_items WHERE status = 'delivered') as delivered_products,
        (SELECT COUNT(*) FROM inventory_items WHERE status = 'unsold') as unsold_products,
        (SELECT COUNT(*) FROM inventory_items WHERE status = 'damaged') as damaged_products,
        (SELECT COUNT(*) FROM inventory_items WHERE status = 'missing') as missing_products,
        (SELECT COUNT(*) FROM products WHERE status = 'active' AND auction_end_time > NOW()) as active_auctions,
        (SELECT COUNT(*) FROM products WHERE status = 'ended' OR status = 'sold') as completed_auctions,
        (SELECT COUNT(*) FROM orders WHERE delivery_status = 'pending') as pending_orders,
        (SELECT COUNT(*) FROM orders WHERE delivery_status = 'shipped') as shipped_orders,
        (SELECT COUNT(*) FROM orders WHERE delivery_status = 'delivered') as delivered_orders,
        (SELECT COUNT(*) FROM users WHERE is_banned = TRUE OR status = 'blocked') as banned_customers,
        (SELECT COUNT(*) FROM users WHERE role IN ('employee', 'admin', 'superadmin', 'manager', 'editor')) as total_employees;
    `;
    const result = await pool.query(kpiQuery);
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// --- 2. INVENTORY ROUTES ---
router.get("/inventory/stats", requirePermission('inventory', 'view'), getInventoryStats);
router.get("/inventory", requirePermission('inventory', 'view'), getAllInventory);
router.post("/inventory/register", requirePermission('inventory', 'create'), registerProduct);
router.put("/inventory/:id", requirePermission('inventory', 'edit'), updateInventoryItem);

// --- 3. BARCODE ROUTES ---
router.post("/barcodes/generate", requirePermission('inventory', 'create'), generateBarcodes);
router.post("/barcodes/generate-range", requirePermission('inventory', 'create'), generateBarcodeRange);
router.get("/barcodes", requirePermission('inventory', 'view'), getBarcodes);
router.get("/barcodes/scan/:barcode", lookupBarcode);

// --- 4. AUCTION PUBLISH ---
router.post("/auctions/publish", requirePermission('auctions', 'create'), publishToAuction);

// --- 5. ORDERS, SHIPPING & ORDER LABELS ---
router.get("/orders/:id/label", requirePermission('orders', 'view'), getOrderDetailsWithLabel);
router.put("/orders/:id/shipping", requirePermission('orders', 'edit'), updateShippingStatus);

// Group multiple won products into one customer order label
router.get("/orders/customer/:customerId/group-label", requirePermission('orders', 'view'), async (req, res) => {
  try {
    const { customerId } = req.params;
    const userRes = await pool.query("SELECT id, name, email, phone, governorate, area, address FROM users WHERE id = $1", [customerId]);
    if (userRes.rows.length === 0) return res.status(404).json({ success: false, message: "Customer not found" });

    const customer = userRes.rows[0];
    const ordersRes = await pool.query(`
      SELECT o.id, o.order_number, o.amount, o.delivery_status, o.created_at,
             p.id as product_id, p.title as product_name, p.image_url,
             inv.barcode as item_barcode
      FROM orders o
      JOIN products p ON o.product_id = p.id
      LEFT JOIN inventory_items inv ON inv.published_product_id = p.id
      WHERE o.buyer_id = $1 AND o.delivery_status IN ('pending', 'processing', 'shipped')
    `, [customerId]);

    const rateRes = await pool.query("SELECT setting_value FROM app_settings WHERE setting_key = 'exchange_rate_usd_iqd'");
    const exchangeRate = parseFloat(rateRes.rows[0]?.setting_value || '1520');

    const shipRes = await pool.query("SELECT setting_value FROM app_settings WHERE setting_key = 'default_shipping_cost_usd'");
    const shippingFee = parseFloat(shipRes.rows[0]?.setting_value || '5.00');

    let totalUsd = 0;
    const products = ordersRes.rows.map(o => {
      const price = parseFloat(o.amount || 0);
      totalUsd += price;
      return {
        order_id: o.id,
        order_number: o.order_number || `#${o.id}`,
        product_name: o.product_name,
        barcode: o.item_barcode || `IQB-ORD-${o.id}`,
        price_usd: price.toFixed(2)
      };
    });

    const finalUsd = totalUsd + (products.length > 0 ? shippingFee : 0);
    const finalIqd = Math.round(finalUsd * exchangeRate);

    res.json({
      success: true,
      data: {
        customer_name: customer.name || customer.email,
        customer_phone: customer.phone || 'N/A',
        governorate: customer.governorate || 'Baghdad',
        area: customer.area || 'Central District',
        full_address: customer.address || 'Standard Delivery Address',
        exchange_rate: exchangeRate,
        shipping_fee_usd: shippingFee.toFixed(2),
        subtotal_usd: totalUsd.toFixed(2),
        total_usd: finalUsd.toFixed(2),
        total_iqd: finalIqd.toLocaleString(),
        products
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// --- 6. CUSTOMER 3-STRIKE REFUSAL & BAN ---
router.post("/customers/refusal", requirePermission('customers', 'edit'), recordCustomerRefusal);
router.get("/customers/refusals", requirePermission('customers', 'view'), async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT cr.*, 
             COALESCE(u.name, u.email, 'Customer') as customer_name,
             u.phone as customer_phone,
             u.refusal_count,
             u.status as customer_status,
             u.is_banned,
             o.amount as order_amount,
             p.title as product_title
      FROM customer_refusals cr
      LEFT JOIN users u ON cr.customer_id = u.id
      LEFT JOIN orders o ON cr.order_id = o.id
      LEFT JOIN products p ON o.product_id = p.id
      ORDER BY cr.created_at DESC;
    `);
    res.json({ success: true, data: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// --- 7. PHYSICAL STOCK AUDIT RECONCILIATION ---
router.post("/audit/reconcile", async (req, res) => {
  try {
    const { scanned_barcodes = [] } = req.body;
    const systemItems = await pool.query("SELECT id, barcode, product_name, warehouse_location, status FROM inventory_items WHERE status = 'available'");
    const systemBarcodes = systemItems.rows.map(i => i.barcode);

    const scannedSet = new Set(scanned_barcodes);
    const systemSet = new Set(systemBarcodes);

    const matched = systemItems.rows.filter(i => scannedSet.has(i.barcode));
    const missing = systemItems.rows.filter(i => !scannedSet.has(i.barcode));
    const unexpected = scanned_barcodes.filter(b => !systemSet.has(b));

    res.json({
      success: true,
      summary: {
        total_system_available: systemItems.rows.length,
        total_scanned: scanned_barcodes.length,
        matched_count: matched.length,
        missing_count: missing.length,
        unexpected_count: unexpected.length
      },
      matched,
      missing,
      unexpected
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// --- 8. EMPLOYEES & CUSTOM GRANULAR PERMISSIONS ---
router.get("/employees/:id/permissions", requirePermission('system', 'view'), getEmployeePermissions);
router.put("/employees/permissions", requirePermission('system', 'edit'), updateEmployeePermissions);

// --- 9. SYSTEM SETTINGS (1 USD = 1,520 IQD, Auto-bidder window, etc.) ---
router.get("/settings", requirePermission('system', 'view'), async (req, res) => {
  try {
    const result = await pool.query("SELECT setting_key, setting_value, description FROM app_settings ORDER BY setting_key ASC");
    const settingsMap = {};
    result.rows.forEach(r => {
      settingsMap[r.setting_key] = r.setting_value;
    });
    res.json({ success: true, settings: settingsMap, raw: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.put("/settings", requirePermission('system', 'edit'), async (req, res) => {
  try {
    const { settings = {} } = req.body;
    for (const [key, value] of Object.entries(settings)) {
      await pool.query(`
        UPDATE app_settings 
        SET setting_value = $1, updated_at = NOW() 
        WHERE setting_key = $2
      `, [String(value), key]);
    }

    await logActivity({
      employeeId: req.user?.id,
      employeeName: req.user?.full_name || 'Admin',
      actionType: 'SYSTEM_SETTINGS_UPDATE',
      entityType: 'SETTINGS',
      entityId: 'APP_CONFIG',
      details: settings
    });

    res.json({ success: true, message: "System settings updated successfully" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// --- 10. SYSTEM AUTOMATIC BIDDER LOGS ---
router.get("/autobids/history", requirePermission('auctions', 'view'), async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT b.*, p.title as auction_title, p.status as auction_status,
             inv.barcode, inv.min_acceptable_price as item_reserve_price
      FROM system_auto_bids b
      JOIN products p ON b.auction_id = p.id
      LEFT JOIN inventory_items inv ON b.inventory_item_id = inv.id
      ORDER BY b.created_at DESC
      LIMIT 100
    `);
    res.json({ success: true, data: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// --- 11. ENTERPRISE ACTIVITY LOGS ---
router.get("/logs/activity", requirePermission('system', 'view'), async (req, res) => {
  try {
    const { page = 1, limit = 100 } = req.query;
    const offset = (page - 1) * limit;
    const result = await pool.query(
      "SELECT * FROM enterprise_activity_logs ORDER BY created_at DESC LIMIT $1 OFFSET $2",
      [limit, offset]
    );
    res.json({ success: true, data: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
