const { Pool } = require('/var/www/bid-backend/Bid-app-Backend/node_modules/pg');

const pool = new Pool({
  connectionString: 'postgresql://iraqbid_user:IraqBid2026SecurePass!@127.0.0.1:5432/iraqbid_production'
});

async function main() {
  try {
    const products = await pool.query("SELECT id, title, status, auction_processed, auction_end_time FROM products WHERE id IN (3, 4, 5)");
    console.table(products.rows);
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

main();
