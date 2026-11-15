import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import pkg from 'pg';
const { Pool } = pkg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env') });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function runMigration() {
  try {
    const sqlPath = path.join(__dirname, 'migrations', '017_iraqbid_enterprise_admin.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    console.log('Running 017_iraqbid_enterprise_admin.sql migration on Neon DB...');
    await pool.query(sql);
    console.log('✅ 017_iraqbid_enterprise_admin.sql executed successfully!');
    await pool.end();
    process.exit(0);
  } catch (err) {
    console.error('❌ Migration failed:', err);
    await pool.end();
    process.exit(1);
  }
}

runMigration();
