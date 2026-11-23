const { Pool } = require('/var/www/bid-backend/Bid-app-Backend/node_modules/pg');
const axiosModule = require('/var/www/bid-backend/Bid-app-Backend/node_modules/axios');
const axios = axiosModule.default || axiosModule;
require('/var/www/bid-backend/Bid-app-Backend/node_modules/dotenv').config({ path: '/var/www/bid-backend/Bid-app-Backend/.env' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://iraqbid_user:IraqBid2026SecurePass!@127.0.0.1:5432/iraqbid_production'
});

const BASE_URL = 'http://127.0.0.1:5055';

async function main() {
  console.log('--- 1. Checking users with 7700914000 in DB ---');
  const uRes = await pool.query("SELECT id, name, phone, role, status, is_verified FROM users WHERE phone LIKE '%7700914000%'");
  console.table(uRes.rows);

  console.log('--- 2. Checking OTP codes table ---');
  const oRes = await pool.query("SELECT * FROM otp_codes WHERE phone_number LIKE '%7700914000%' ORDER BY id DESC LIMIT 5");
  console.table(oRes.rows);

  console.log('\n--- 3. Testing POST /api/auth/send-otp with type: login ---');
  try {
    const sRes = await axios.post(`${BASE_URL}/api/auth/send-otp`, {
      phone: '+9647700914000',
      type: 'login'
    });
    console.log('send-otp response:', sRes.data);
  } catch (err) {
    console.log('send-otp error:', err.response?.status, err.response?.data || err.message);
  }

  console.log('\n--- 4. Testing POST /api/auth/verify-otp with 123456 and type: login ---');
  try {
    const vRes = await axios.post(`${BASE_URL}/api/auth/verify-otp`, {
      phone: '+9647700914000',
      otp: '123456',
      type: 'login'
    });
    console.log('verify-otp response:', vRes.data);
  } catch (err) {
    console.log('verify-otp error:', err.response?.status, err.response?.data || err.message);
  }

  console.log('\n--- 5. Testing with an arbitrary normal number (e.g. +9647712345678) ---');
  try {
    const sRes2 = await axios.post(`${BASE_URL}/api/auth/send-otp`, {
      phone: '+9647712345678',
      type: 'login'
    });
    console.log('send-otp normal response:', sRes2.data);

    const vRes2 = await axios.post(`${BASE_URL}/api/auth/verify-otp`, {
      phone: '+9647712345678',
      otp: sRes2.data.debug_otp,
      type: 'login'
    });
    console.log('verify-otp normal user auto-created:', vRes2.data.user.id, vRes2.data.user.phone, vRes2.data.message);
  } catch (err) {
    console.log('send-otp normal error:', err.response?.status, err.response?.data || err.message);
  }

  await pool.end();
}

main().catch(console.error);
