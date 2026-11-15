import pool from '/var/www/bid-backend/Bid-app-Backend/src/config/db.js';

async function seedCompleteData() {
  try {
    const userRes = await pool.query("SELECT id, name, phone, email FROM users WHERE role NOT IN ('superadmin', 'admin') LIMIT 2");
    const buyer1Id = userRes.rows[0]?.id || 222;
    const buyer2Id = userRes.rows[1]?.id || 223;

    await pool.query("UPDATE users SET governorate = 'Baghdad', area = 'Al-Mansour', address = 'Street 14, Villa 8' WHERE id = " + buyer1Id);
    await pool.query("UPDATE users SET governorate = 'Basra', area = 'Al-Ashar', address = 'Corniche Road, Bldg 4' WHERE id = " + buyer2Id);

    const orderCountRes = await pool.query("SELECT COUNT(*) FROM orders");
    if (parseInt(orderCountRes.rows[0].count) === 0) {
      await pool.query(`
        INSERT INTO orders (
          product_id, buyer_id, amount, status, payment_status, delivery_status,
          shipping_company, tracking_number, shipping_cost, expected_delivery_date,
          shipping_notes, order_number, final_price, created_at
        ) VALUES 
        (217, ${buyer1Id}, 250.00, 'processing', 'completed', 'pending', 'Al-Wissam Express', 'TRK-98234-IQ', 5.00, NOW() + interval '2 days', 'Handle with care: Electronics', 'ORD-2026-001', 255.00, NOW()),
        (213, ${buyer2Id}, 180.00, 'processing', 'pending', 'shipped', 'Al-Nahrain Cargo', 'TRK-44129-IQ', 7.50, NOW() + interval '3 days', 'Customer requested morning delivery', 'ORD-2026-002', 187.50, NOW() - interval '1 day');
      `);
      console.log('✅ Seeded 2 customer orders!');
    }

    const invCount = await pool.query("SELECT COUNT(*) FROM inventory_items");
    if (parseInt(invCount.rows[0].count) <= 1) {
      await pool.query(`
        INSERT INTO inventory_items (
          barcode, product_name, description, images, original_retail_price,
          starting_bid_price, buy_now_price, actual_acquisition_cost, condition,
          defect_alert, defect_details, warehouse_location, status, created_at
        ) VALUES 
        ('IQB-000002', 'Sony PlayStation 5 Slim Digital Edition', 'Includes 1 DualSense controller and HDMI cable', ARRAY['https://images.unsplash.com/photo-1606813907291-d86efa9b94db?w=800'], 499.00, 150.00, 420.00, 320.00, 'New', false, '', 'Slot B-04', 'available', NOW()),
        ('IQB-000003', 'MacBook Air 15 M3 Chip 512GB Midnight', 'Apple Silicon M3, 8-core CPU, 10-core GPU', ARRAY['https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=800'], 1499.00, 400.00, 1290.00, 950.00, 'New', false, '', 'Slot A-12', 'available', NOW()),
        ('IQB-000004', 'Rolex Submariner Date 41mm Oystersteel', 'Reference 126610LN, complete with box and papers', ARRAY['https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=800'], 10500.00, 2500.00, 9200.00, 7500.00, 'Open Box', true, 'Micro-hairline on clasp only', 'Vault Safe 01', 'available', NOW()),
        ('IQB-000005', 'Dyson V15 Detect Absolute Vacuum', 'Laser reveals microscopic dust, HEPA filtration', ARRAY['https://images.unsplash.com/photo-1558317374-067fb5f30001?w=800'], 749.00, 180.00, 620.00, 450.00, 'New', false, '', 'Slot C-09', 'available', NOW());
      `);
      console.log('✅ Seeded 4 premium physical warehouse inventory items with high-res photos!');
    }

    await pool.query("UPDATE barcodes SET status = 'assigned' WHERE barcode_number IN ('IQB-000002', 'IQB-000003', 'IQB-000004', 'IQB-000005');");

    console.log('--- ENTERPRISE SUITE DATA SEEDING COMPLETE ---');
  } catch (err) {
    console.error('SEED_ERROR:', err);
  } finally {
    process.exit(0);
  }
}

seedCompleteData();
