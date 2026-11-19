const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgresql://iraqbid_user:IraqBid2026SecurePass!@127.0.0.1:5432/iraqbid_production' });

async function main() {
  console.log("=== All Tables in Database ===");
  const tables = await pool.query(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    ORDER BY table_name;
  `);
  console.log(tables.rows.map(r => r.table_name));

  console.log("\n=== Staff in Users Table ===");
  const staff = await pool.query(`
    SELECT id, name, phone, role, email 
    FROM users 
    WHERE role IN ('superadmin', 'admin', 'manager', 'editor', 'moderator', 'viewer', 'employee')
  `);
  console.table(staff.rows);

  console.log("\n=== Coupons Table Schema ===");
  const coupons = await pool.query(`
    SELECT column_name, data_type, is_nullable 
    FROM information_schema.columns 
    WHERE table_name = 'coupons'
  `);
  console.table(coupons.rows);

  await pool.end();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
