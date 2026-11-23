require("dotenv").config({path: "/var/www/bid-backend/Bid-app-Backend/.env"});
const {Pool} = require("pg");
const bcrypt = require("bcrypt");
const p = new Pool({connectionString: process.env.DATABASE_URL});

async function main() {
  const admins = await p.query("SELECT id, name, email, role, password FROM users WHERE role IN ('admin', 'superadmin') ORDER BY id ASC");
  console.log("Total admins found:", admins.rows.length);
  
  const passwordsToTest = [
    "Admin123!",
    "admin123",
    "Admin123",
    "superadmin123",
    "IraqBid2026SecurePass!",
    "IraqBid2026!",
    "Iraqbid123!",
    "iraqbid123",
    "admin",
    "123456"
  ];

  for (const adm of admins.rows) {
    console.log(`\n--- Admin ID ${adm.id}: ${adm.name} (${adm.email}) [${adm.role}] ---`);
    let matched = false;
    for (const pwd of passwordsToTest) {
      if (adm.password) {
        const isMatch = await bcrypt.compare(pwd, adm.password);
        if (isMatch) {
          console.log(`✅ MATCH FOUND for ${adm.email}: Password is "${pwd}"`);
          matched = true;
          break;
        }
      }
    }
    if (!matched) {
      console.log(`❌ None of common passwords matched for ${adm.email}`);
    }
  }
  await p.end();
}
main();
