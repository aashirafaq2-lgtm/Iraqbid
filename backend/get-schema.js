
import pkg from 'pg';
const { Pool } = pkg;
const pool = new Pool({ connectionString: 'postgresql://neondb_owner:npg_xejr5zMtIH2v@ep-polished-credit-ahmwg7k7-pooler.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require' });
async function run() {
    const res = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'products'");
    console.log(res.rows.map(r => r.column_name));
    process.exit(0);
}
run();
