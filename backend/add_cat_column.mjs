import pool from './src/config/db.js';

async function updateSchema() {
  // 1. Add category_id column to inventory_items
  await pool.query(`
    ALTER TABLE inventory_items 
    ADD COLUMN IF NOT EXISTS category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL;
  `);
  console.log("Added category_id to inventory_items");

  // 2. Extend JWT_EXPIRES_IN if needed in process or db
  await pool.end();
}
updateSchema().catch(console.error);
