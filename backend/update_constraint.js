import pool from '/var/www/bid-backend/Bid-app-Backend/src/config/db.js';

async function updateConstraint() {
  try {
    const res = await pool.query(`
      SELECT pg_get_constraintdef(c.oid) as def
      FROM pg_constraint c
      JOIN pg_class t ON c.conrelid = t.oid
      WHERE t.relname = 'users' AND c.conname = 'users_role_check';
    `);
    console.log('OLD_CONSTRAINT:', res.rows[0]?.def);

    // Drop old constraint and add updated one supporting: superadmin, admin, manager, editor, buyer, seller, moderator, employee, viewer, company_products, seller_products
    await pool.query("ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;");
    await pool.query(`
      ALTER TABLE users ADD CONSTRAINT users_role_check 
      CHECK (role IN (
        'superadmin', 'admin', 'manager', 'editor', 
        'moderator', 'employee', 'viewer', 
        'buyer', 'seller', 'company_products', 'seller_products'
      ));
    `);
    console.log('SUCCESS_UPDATED_CONSTRAINT_FOR_4_TIERS');
  } catch (err) {
    console.error('ERROR:', err);
  } finally {
    process.exit(0);
  }
}

updateConstraint();

