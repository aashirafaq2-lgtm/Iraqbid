
import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
    connectionString: 'postgresql://neondb_owner:npg_xejr5zMtIH2v@ep-polished-credit-ahmwg7k7-pooler.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require'
});

async function diagnose() {
    try {
        console.log('--- DIAGNOSTIC DATA ---');

        const companyRes = await pool.query(`
      SELECT id, title, seller_id 
      FROM products 
      WHERE seller_id IS NULL AND status = 'approved' AND auction_end_time > NOW()
    `);
        console.log(`\nFound ${companyRes.rowCount} Company products (seller_id IS NULL):`);
        console.table(companyRes.rows.slice(0, 5));

        const sellerRes = await pool.query(`
      SELECT id, title, seller_id 
      FROM products 
      WHERE seller_id IS NOT NULL AND status = 'approved' AND auction_end_time > NOW()
    `);
        console.log(`\nFound ${sellerRes.rowCount} Seller products (seller_id IS NOT NULL):`);
        console.table(sellerRes.rows.slice(0, 5));

        const mysteriousRes = await pool.query(`
      SELECT id, title, seller_id 
      FROM products 
      WHERE seller_id = 0 OR seller_id IS NOT NULL AND seller_id NOT IN (SELECT id FROM users)
    `);
        if (mysteriousRes.rowCount > 0) {
            console.log(`\nFound ${mysteriousRes.rowCount} Mysterious products (seller_id=0 or orphaned):`);
            console.table(mysteriousRes.rows);
        }

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

diagnose();
