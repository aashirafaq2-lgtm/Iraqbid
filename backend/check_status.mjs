import pool from './src/config/db.js';

async function main() {
  const users = await pool.query("SELECT id, name, email, role, phone FROM users WHERE role IN ('admin', 'superadmin', 'manager')");
  console.log('Admins in DB:', users.rows);

  const categories = await pool.query("SELECT id, name FROM categories");
  console.log('Categories:', categories.rows);

  const prodCount = await pool.query("SELECT count(id) FROM products");
  console.log('Product count:', prodCount.rows[0]);

  const activeProds = await pool.query("SELECT id, title, status, auction_end_time FROM products LIMIT 5");
  console.log('Sample products:', activeProds.rows);

  await pool.end();
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
