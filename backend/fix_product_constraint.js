import pool from '/var/www/bid-backend/Bid-app-Backend/src/config/db.js';

async function checkProductConstraint() {
  const res = await pool.query(`
    SELECT pg_get_constraintdef(c.oid) as def
    FROM pg_constraint c
    JOIN pg_class t ON c.conrelid = t.oid
    WHERE t.relname = 'products' AND c.conname = 'products_status_check';
  `);
  console.log('PRODUCTS_STATUS_CONSTRAINT:', res.rows[0]?.def);

  const distinctRes = await pool.query("SELECT DISTINCT status FROM products");
  console.log('EXISTING_PRODUCT_STATUSES:', distinctRes.rows);

  // Update constraint to support all active auction statuses
  await pool.query("ALTER TABLE products DROP CONSTRAINT IF EXISTS products_status_check;");
  await pool.query(`
    ALTER TABLE products ADD CONSTRAINT products_status_check 
    CHECK (status IN ('pending', 'approved', 'active', 'ended', 'sold', 'rejected', 'cancelled'));
  `);
  console.log('✅ UPDATED products_status_check to include active, ended, approved, pending, sold, rejected, cancelled');

  process.exit(0);
}

checkProductConstraint();

