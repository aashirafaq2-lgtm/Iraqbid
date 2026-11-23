const { Pool } = require('pg');
const pool = new Pool({
  connectionString: 'postgresql://iraqbid_user:IraqBid2026SecurePass!@127.0.0.1:5432/iraqbid_production'
});

async function run() {
  const res = await pool.query("SELECT id, title, image_url, images FROM products WHERE title ILIKE '%iPhone 15%'");
  console.log(JSON.stringify(res.rows, null, 2));
  await pool.end();
}
run();
