
import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
    connectionString: 'postgresql://neondb_owner:npg_xejr5zMtIH2v@ep-polished-credit-ahmwg7k7-pooler.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require'
});

async function checkProducts() {
    try {
        const res = await pool.query(`
      SELECT 
        id, title, status, seller_id, auction_end_time, created_at
      FROM products 
      ORDER BY created_at DESC 
      LIMIT 10;
    `);
        res.rows.forEach(r => {
            console.log(`ID: ${r.id} | Title: ${r.title} | Status: ${r.status} | Seller: ${r.seller_id} | End: ${r.auction_end_time} | Created: ${r.created_at}`);
        });

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

checkProducts();
