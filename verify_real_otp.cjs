const axiosModule = require('axios');
const axios = axiosModule.default || axiosModule;
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://iraqbid_user:IraqBid2026SecurePass!@127.0.0.1:5432/iraqbid_production'
});

async function testFullOtpFlow() {
  console.log("=== Testing Full OTP Flow for 07700914000 ===");
  try {
    const res = await axios.post('http://127.0.0.1:5055/api/auth/send-otp', {
      phone: '07700914000',
      type: 'login'
    });
    console.log("1. Send OTP Response status:", res.status);

    const dbRes = await pool.query(
      "SELECT phone_number, otp_code, created_at, expires_at FROM otp_codes WHERE phone_number = '+9647700914000' ORDER BY created_at DESC LIMIT 1"
    );
    const generatedCode = dbRes.rows[0].otp_code;
    console.log("2. Code in DB:", generatedCode);

    const verifyRes = await axios.post('http://127.0.0.1:5055/api/auth/verify-otp', {
      phone: '07700914000',
      otp: generatedCode
    });
    console.log("3. Verify OTP Response status:", verifyRes.status);
    console.log("4. User returned:", verifyRes.data.user ? verifyRes.data.user.name : "Token granted");
    console.log("✅ FULL FLOW VERIFIED PERFECTLY!");
  } catch (err) {
    console.error("Test error:", err.response ? err.response.data : err.message);
  } finally {
    await pool.end();
  }
}

testFullOtpFlow();
