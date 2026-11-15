import pool from './src/config/db.js';

async function seed() {
  const settings = [
    { key: 'exchange_rate_usd_iqd', val: '1520', desc: 'Exchange rate 1 USD to IQD' },
    { key: 'auto_bidder_enabled', val: 'true', desc: 'Master toggle for system automatic bidder bot' },
    { key: 'auto_bidder_window_minutes', val: '10', desc: 'Trigger automatic bids in the last X minutes before end' },
    { key: 'default_shipping_cost_usd', val: '5.00', desc: 'Standard shipping fee in USD' }
  ];

  for (const s of settings) {
    await pool.query(`
      INSERT INTO app_settings (setting_key, setting_value, description)
      VALUES ($1, $2, $3)
      ON CONFLICT (setting_key) 
      DO UPDATE SET setting_value = EXCLUDED.setting_value, updated_at = NOW();
    `, [s.key, s.val, s.desc]);
  }
  console.log("app_settings seeded successfully!");
  await pool.end();
}
seed().catch(console.error);

