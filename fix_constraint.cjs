const { Pool } = require('/var/www/bid-backend/Bid-app-Backend/node_modules/pg');

const pool = new Pool({
  connectionString: 'postgresql://iraqbid_user:IraqBid2026SecurePass!@127.0.0.1:5432/iraqbid_production'
});

async function main() {
  try {
    await pool.query(`
      ALTER TABLE notifications ALTER COLUMN type SET DEFAULT 'system';
      ALTER TABLE notifications ALTER COLUMN type DROP NOT NULL;
    `);
    console.log("✅ Notifications table updated!");

    // Also restart PM2
    process.exit(0);
  } catch (err) {
    console.error("❌ Error:", err);
    process.exit(1);
  }
}

main();
