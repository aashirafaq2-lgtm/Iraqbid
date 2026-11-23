require("dotenv").config({path: "/var/www/bid-backend/Bid-app-Backend/.env"});
const {Pool} = require("pg");
const p = new Pool({connectionString: process.env.DATABASE_URL});

async function main() {
  await p.query(`
    CREATE TABLE IF NOT EXISTS system_settings (
      key VARCHAR(100) PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);
  
  await p.query(`
    INSERT INTO system_settings (key, value)
    VALUES ('accounts_whatsapp_number', '+9647700000000')
    ON CONFLICT (key) DO NOTHING;
  `);

  const rows = await p.query("SELECT * FROM system_settings");
  console.log("System settings:", rows.rows);
  await p.end();
}
main();
