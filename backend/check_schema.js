import pool from '/var/www/bid-backend/Bid-app-Backend/src/config/db.js';

async function checkCols() {
  const res = await pool.query(`
    SELECT column_name, data_type, is_nullable, column_default 
    FROM information_schema.columns 
    WHERE table_name = 'inventory_items' 
    ORDER BY ordinal_position;
  `);
  console.log('INVENTORY_ITEMS_COLUMNS:');
  console.table(res.rows);
  process.exit(0);
}

checkCols();

