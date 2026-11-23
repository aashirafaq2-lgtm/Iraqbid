require("dotenv").config({path: "/var/www/bid-backend/Bid-app-Backend/.env"});
const {Pool} = require("pg");
const p = new Pool({connectionString: process.env.DATABASE_URL});

async function main() {
  const res = await p.query("SELECT id, name, email, role, phone FROM users WHERE role IN ('admin', 'superadmin')");
  console.log("Admins:", res.rows);
  await p.end();
}
main();
