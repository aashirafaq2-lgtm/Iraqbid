import pg from 'pg';

async function updateAuctionTimes() {
  const pool = new pg.Pool({
    connectionString: 'postgresql://neondb_owner:npg_xejr5zMtIH2v@ep-polished-credit-ahmwg7k7-pooler.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require'
  });

  try {
    const updateRes = await pool.query(
      "UPDATE products SET auction_end_time = NOW() + INTERVAL '23 hours 59 minutes' WHERE status = 'approved' OR status = 'active'"
    );
    console.log('Successfully updated auction_end_time for approved products. Rows updated:', updateRes.rowCount);

    const check = await pool.query(
      "SELECT id, title, auction_end_time, ROUND(EXTRACT(EPOCH FROM (auction_end_time - NOW())) / 3600, 2) as hours_left FROM products WHERE status = 'approved' LIMIT 5"
    );
    console.log('Sample rows with exactly 24h countdown:');
    console.table(check.rows);
  } catch (err) {
    console.error('Error updating auction times:', err);
  } finally {
    await pool.end();
  }
}

updateAuctionTimes();
