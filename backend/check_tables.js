import pool from '/var/www/bid-backend/Bid-app-Backend/src/config/db.js';

async function checkCols() {
  const pCols = await pool.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'products' ORDER BY ordinal_position;");
  console.log('PRODUCTS_COLUMNS:');
  console.table(pCols.rows);

  const oCols = await pool.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'orders' ORDER BY ordinal_position;");
  console.log('ORDERS_COLUMNS:');
  console.table(oCols.rows);

  process.exit(0);
}

checkCols();

