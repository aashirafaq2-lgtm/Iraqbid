import pool from '/var/www/bid-backend/Bid-app-Backend/src/config/db.js';
import bcrypt from 'bcrypt';

async function main() {
  try {
    // 1. Create superadmin if not exists
    const superadminCheck = await pool.query("SELECT id, email, role FROM users WHERE email = 'superadmin@iraqbid.com'");
    if (superadminCheck.rows.length === 0) {
      const hash = await bcrypt.hash('Admin@IraqBid2026!', 10);
      const insertRes = await pool.query(
        "INSERT INTO users (name, email, password, role) VALUES ($1, $2, $3, $4) RETURNING id, email, role",
        ['IraqBid Super Admin', 'superadmin@iraqbid.com', hash, 'superadmin']
      );
      console.log('SUCCESS_CREATED_SUPERADMIN:', JSON.stringify(insertRes.rows[0]));
    } else {
      console.log('SUPERADMIN_ALREADY_EXISTS:', JSON.stringify(superadminCheck.rows[0]));
    }

    // 2. Ensure test accounts for 4 tiers exist for verification
    const testAccounts = [
      { name: 'Senior Operations Admin', email: 'admin@iraqbid.com', pass: 'Admin@2026!', role: 'admin' },
      { name: 'Shift Manager', email: 'manager@iraqbid.com', pass: 'Manager@2026!', role: 'manager' },
      { name: 'Inventory Product Editor', email: 'editor@iraqbid.com', pass: 'Editor@2026!', role: 'editor' },
    ];

    for (const acc of testAccounts) {
      const check = await pool.query("SELECT id, email, role FROM users WHERE email = $1", [acc.email]);
      if (check.rows.length === 0) {
        const h = await bcrypt.hash(acc.pass, 10);
        const ins = await pool.query(
          "INSERT INTO users (name, email, password, role) VALUES ($1, $2, $3, $4) RETURNING id, email, role",
          [acc.name, acc.email, h, acc.role]
        );
        console.log(`SUCCESS_CREATED_${acc.role.toUpperCase()}:`, JSON.stringify(ins.rows[0]));
      } else {
        await pool.query("UPDATE users SET role = $1 WHERE email = $2", [acc.role, acc.email]);
        console.log(`UPDATED_ROLE_${acc.role.toUpperCase()}:`, acc.email);
      }
    }
  } catch (err) {
    console.error('ERROR:', err);
  } finally {
    process.exit(0);
  }
}

main();
