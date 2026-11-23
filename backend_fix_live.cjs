require('dotenv').config({ path: '/var/www/bid-backend/Bid-app-Backend/.env' });
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function run() {
  try {
    console.log('Connecting...');
    await pool.query('ALTER TABLE products DROP CONSTRAINT IF EXISTS products_status_check;');
    await pool.query("ALTER TABLE products ADD CONSTRAINT products_status_check CHECK (status IN ('pending', 'approved', 'rejected', 'sold', 'ended', 'active', 'cancelled', 'completed'));");
    console.log('✅ Constraint updated successfully!');

    // Also check notifications table type constraint
    try {
      await pool.query("ALTER TABLE notifications ALTER COLUMN type SET DEFAULT 'system';");
      await pool.query("ALTER TABLE notifications ALTER COLUMN type DROP NOT NULL;");
      console.log('✅ Notifications column fixed!');
    } catch (ne) {
      console.log('Notification fix note:', ne.message);
    }

    // Run ended auctions update
    const res = await pool.query("UPDATE products SET status = 'ended' WHERE auction_end_time < NOW() AND status IN ('approved', 'active') RETURNING id;");
    console.log('✅ Updated ended products:', res.rows.map(x => x.id));

    // Also check special bidders
    const sb = await pool.query("SELECT * FROM special_bidders;");
    console.log('Special bidders count:', sb.rows.length);

  } catch (e) {
    console.error('Error running fix:', e);
  } finally {
    await pool.end();
  }
}

run();
