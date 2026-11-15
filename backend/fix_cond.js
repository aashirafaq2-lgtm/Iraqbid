import pool from '/var/www/bid-backend/Bid-app-Backend/src/config/db.js';

async function fixCondition() {
  const res = await pool.query(`
    SELECT pg_get_constraintdef(c.oid) as def
    FROM pg_constraint c
    JOIN pg_class t ON c.conrelid = t.oid
    WHERE t.relname = 'inventory_items' AND c.conname = 'inventory_items_condition_check';
  `);
  console.log('OLD_CONDITION_DEF:', res.rows[0]?.def);

  await pool.query("ALTER TABLE inventory_items DROP CONSTRAINT IF EXISTS inventory_items_condition_check;");
  await pool.query(`
    ALTER TABLE inventory_items ADD CONSTRAINT inventory_items_condition_check 
    CHECK (condition IN ('New', 'Open Box', 'Used', 'Refurbished', 'Scratch / Dent'));
  `);
  console.log('✅ Condition check updated successfully!');
  process.exit(0);
}

fixCondition();

