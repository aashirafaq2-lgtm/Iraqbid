require("dotenv").config({path: "/var/www/bid-backend/Bid-app-Backend/.env"});
const {Pool} = require("pg");
const bcrypt = require("bcrypt");
const p = new Pool({connectionString: process.env.DATABASE_URL});

async function main() {
  const hash = await bcrypt.hash("IraqBid2026!", 10);
  
  // Set password for all 3 admin accounts so whichever he types works:
  // 1. superadmin227@iraqbid.net
  // 2. superadmin@bidmaster.com
  // 3. admin@bidmaster.com
  // Also insert or update superadmin@iraqbid.com if not exists
  const res = await p.query(
    "UPDATE users SET password = $1 WHERE role IN ('admin', 'superadmin') RETURNING id, name, email, role",
    [hash]
  );
  console.log("Updated passwords for:", res.rows);

  // Also check if superadmin@iraqbid.com exists
  const checkExtra = await p.query("SELECT id FROM users WHERE email = 'superadmin@iraqbid.com'");
  if (checkExtra.rows.length === 0) {
    await p.query(
      "INSERT INTO users (name, email, password, role, is_verified, status) VALUES ('Super Admin', 'superadmin@iraqbid.com', $1, 'superadmin', true, 'approved')",
      [hash]
    );
    console.log("Created superadmin@iraqbid.com with IraqBid2026!");
  } else {
    await p.query("UPDATE users SET password = $1 WHERE email = 'superadmin@iraqbid.com'", [hash]);
    console.log("Updated superadmin@iraqbid.com with IraqBid2026!");
  }

  await p.end();
}
main();
