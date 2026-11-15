
import pkg from 'pg';
const { Pool } = pkg;
const pool = new Pool({
    connectionString: 'postgresql://neondb_owner:npg_xejr5zMtIH2v@ep-polished-credit-ahmwg7k7-pooler.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require'
});

async function checkPending() {
    const res = await pool.query(`
    SELECT 
      p.id, p.title, p.status, p.seller_id, 
      u.name as seller_name, u.role,
      p.created_at
    FROM products p
    LEFT JOIN users u ON p.seller_id = u.id
    WHERE p.status = 'pending'
    ORDER BY p.created_at DESC
  `);

    console.log('=== PENDING PRODUCTS IN DATABASE ===\n');
    console.log(`Total: ${res.rows.length} products\n`);

    if (res.rows.length > 0) {
        console.table(res.rows);
    } else {
        console.log('No pending products found.');
    }

    process.exit(0);
}

checkPending();
