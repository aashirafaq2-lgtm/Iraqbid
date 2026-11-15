
import pkg from 'pg';
const { Pool } = pkg;
const pool = new Pool({ connectionString: 'postgresql://neondb_owner:npg_xejr5zMtIH2v@ep-polished-credit-ahmwg7k7-pooler.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require' });
async function run() {
    const res = await pool.query(`
    SELECT id, name, role FROM users 
    WHERE name ILIKE '%Company%' 
       OR name ILIKE '%BidMaster%'
       OR name ILIKE '%Mazaadati%'
  `);
    console.table(res.rows);
    process.exit(0);
}
run();
