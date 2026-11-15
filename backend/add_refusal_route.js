import fs from 'fs';

const filePath = 'e:/Ahmed work/iraq-bid-app-master/backend/src/Routes/enterpriseRoutes.js';
let code = fs.readFileSync(filePath, 'utf8');

const refusalRoutes = `
// --- 6. CUSTOMER 3-STRIKE REFUSAL & BAN ---
router.post("/customers/refusal", requirePermission('customers', 'edit'), recordCustomerRefusal);
router.get("/customers/refusals", requirePermission('customers', 'view'), async (req, res) => {
  try {
    const result = await pool.query(\`
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
    \`);
    res.json({ success: true, data: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Physical stock audit reconciliation
router.post("/audit/reconcile", async (req, res) => {
  try {
    const { scanned_barcodes = [] } = req.body;
    
    // Fetch all available inventory in warehouse
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
`;

code = code.replace('// --- 6. CUSTOMER 3-STRIKE REFUSAL & BAN ---\nrouter.post("/customers/refusal", requirePermission(\'customers\', \'edit\'), recordCustomerRefusal);', refusalRoutes);
fs.writeFileSync(filePath, code, 'utf8');
console.log('Added /customers/refusals and /audit/reconcile to enterpriseRoutes.js');

