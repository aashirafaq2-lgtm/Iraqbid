import pool from './src/config/db.js';

async function setup() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS app_settings (
      key VARCHAR(100) PRIMARY KEY,
      value TEXT NOT NULL,
      description TEXT,
      updated_at TIMESTAMP DEFAULT NOW(),
      updated_by INTEGER
    );
  `);

  await pool.query(`
    INSERT INTO app_settings (key, value, description)
    VALUES 
      ('exchange_rate_usd_iqd', '1520', 'Exchange rate 1 USD to IQD'),
      ('auto_bidder_enabled', 'true', 'Master toggle for system automatic bidder bot'),
      ('auto_bidder_window_minutes', '10', 'Trigger automatic bids in the last X minutes before end'),
      ('default_shipping_cost_usd', '5.00', 'Standard shipping fee in USD')
    ON CONFLICT (key) DO NOTHING;
  `);

  // Verify and ensure employee_permissions structure has correct columns
  await pool.query(`
    CREATE TABLE IF NOT EXISTS employee_permissions (
      id SERIAL PRIMARY KEY,
      employee_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      module VARCHAR(50) NOT NULL,
      can_view BOOLEAN DEFAULT FALSE,
      can_create BOOLEAN DEFAULT FALSE,
      can_edit BOOLEAN DEFAULT FALSE,
      can_delete BOOLEAN DEFAULT FALSE,
      can_approve BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW(),
      UNIQUE(employee_id, module)
    );
  `);

  console.log("Database tables verified and initialized successfully!");
  await pool.end();
}
setup().catch(console.error);

