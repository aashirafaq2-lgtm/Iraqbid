import pg from 'pg';

const pool = new pg.Pool({
  connectionString: 'postgresql://neondb_owner:npg_xejr5zMtIH2v@ep-polished-credit-ahmwg7k7-pooler.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require',
});

async function main() {
  const res = await pool.query(`
    UPDATE products
    SET auction_end_time = NOW() + (make_interval(hours => (id % 23) + 1, mins => (id * 11) % 59, secs => (id * 17) % 59))
    WHERE status = 'approved'
    RETURNING id, title, auction_end_time
  `);
  console.log(`Updated ${res.rowCount} products with realistic staggered countdown timers.`);
  pool.end();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
