import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '.env') });

import pool from './src/config/db.js';

async function testFeatures() {
  try {
    console.log('Testing Barcode Generation directly...');
    const seqRes = await pool.query(
      "UPDATE barcode_sequences SET current_val = current_val + 3 WHERE prefix = 'IQB' RETURNING current_val"
    );
    const endVal = seqRes.rows[0].current_val;
    console.log('✅ Current Barcode Sequence Value:', endVal);
    
    // Check tables
    const items = await pool.query("SELECT COUNT(*) FROM inventory_items");
    console.log('✅ Inventory items count in Neon DB:', items.rows[0].count);
    
    const kpiRes = await pool.query(`
      SELECT 
        (SELECT COUNT(*) FROM inventory_items) as total_products,
        (SELECT COUNT(*) FROM products WHERE status = 'active') as active_auctions,
        (SELECT COUNT(*) FROM users WHERE is_banned = TRUE) as banned_users
    `);
    console.log('✅ Enterprise Dashboard KPI query verified:', kpiRes.rows[0]);

    await pool.end();
    process.exit(0);
  } catch (err) {
    console.error('❌ Test error:', err);
    await pool.end();
    process.exit(1);
  }
}

testFeatures();
