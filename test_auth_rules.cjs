const axiosModule = require('axios');
const axios = axiosModule.default || axiosModule;
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://iraqbid_user:IraqBid2026SecurePass!@127.0.0.1:5432/iraqbid_production'
});

async function runTests() {
  const testPhone = '07799988811';
  const normalizedPhone = '+9647799988811';

  console.log("=== Testing Auth Registration & Persistence Rules ===");

  // Ensure test phone does NOT exist initially
  await pool.query("DELETE FROM users WHERE phone = $1", [normalizedPhone]);
  await pool.query("DELETE FROM otp_codes WHERE phone_number = $1", [normalizedPhone]);

  // Test 1: Unregistered phone attempts to LOGIN
  console.log("\n[Test 1] Unregistered phone tries to LOGIN...");
  try {
    await axios.post('http://127.0.0.1:5055/api/auth/send-otp', {
      phone: testPhone,
      type: 'login'
    });
    console.error("❌ FAILED: Should have rejected unregistered login!");
  } catch (err) {
    if (err.response && err.response.status === 404 && err.response.data.code === 'USER_NOT_FOUND') {
      console.log("✅ PASSED: Rejected with 404 USER_NOT_FOUND:", err.response.data.message);
    } else {
      console.error("❌ Unexpected response:", err.response ? err.response.data : err.message);
    }
  }

  // Test 2: Unregistered phone attempts to REGISTER
  console.log("\n[Test 2] Unregistered phone tries to REGISTER / SIGNUP...");
  let otpCode = null;
  try {
    const res = await axios.post('http://127.0.0.1:5055/api/auth/send-otp', {
      phone: testPhone,
      type: 'register'
    });
    console.log("✅ PASSED: OTP sent successfully for signup, status:", res.status);

    const otpDb = await pool.query(
      "SELECT otp_code FROM otp_codes WHERE phone_number = $1 ORDER BY created_at DESC LIMIT 1",
      [normalizedPhone]
    );
    otpCode = otpDb.rows[0]?.otp_code;
    console.log("   Generated OTP in DB:", otpCode);
  } catch (err) {
    console.error("❌ Registration send-otp failed:", err.response ? err.response.data : err.message);
  }

  // Test 3: Complete registration via verify-otp
  console.log("\n[Test 3] Verifying OTP and completing registration...");
  try {
    const res = await axios.post('http://127.0.0.1:5055/api/auth/verify-otp', {
      phone: testPhone,
      otp: otpCode,
      type: 'register',
      name: 'Test Persistent User'
    });
    console.log("✅ PASSED: User registered successfully! Status:", res.status);
    console.log("   User Name in DB:", res.data.user?.name);
    console.log("   User ID:", res.data.user?.id);
  } catch (err) {
    console.error("❌ Verify OTP failed:", err.response ? err.response.data : err.message);
  }

  // Test 4: Now that account exists, LOGIN should succeed!
  console.log("\n[Test 4] Now registered user tries to LOGIN...");
  try {
    const res = await axios.post('http://127.0.0.1:5055/api/auth/send-otp', {
      phone: testPhone,
      type: 'login'
    });
    console.log("✅ PASSED: Registered user successfully received login OTP! Status:", res.status);
  } catch (err) {
    console.error("❌ Registered user login failed:", err.response ? err.response.data : err.message);
  }

  // Test 5: Registered user tries to REGISTER AGAIN -> Should be rejected!
  console.log("\n[Test 5] Registered user tries to SIGNUP AGAIN with same number...");
  try {
    await axios.post('http://127.0.0.1:5055/api/auth/send-otp', {
      phone: testPhone,
      type: 'register'
    });
    console.error("❌ FAILED: Should have rejected duplicate registration!");
  } catch (err) {
    if (err.response && err.response.status === 400 && err.response.data.code === 'USER_ALREADY_EXISTS') {
      console.log("✅ PASSED: Rejected duplicate registration with 400 USER_ALREADY_EXISTS:", err.response.data.message);
    } else {
      console.error("❌ Unexpected response:", err.response ? err.response.data : err.message);
    }
  }

  // Clean up test user
  await pool.query("DELETE FROM users WHERE phone = $1", [normalizedPhone]);
  await pool.query("DELETE FROM otp_codes WHERE phone_number = $1", [normalizedPhone]);
  console.log("\n🧹 Cleaned up test record.");
  await pool.end();
}

runTests();
