require('dotenv').config({ path: '/var/www/bid-backend/Bid-app-Backend/.env' });
const axiosModule = require('axios');
const axios = axiosModule.default || axiosModule;
const { Pool } = require('pg');
const jwt = require('jsonwebtoken');

const pool = new Pool({
  connectionString: 'postgresql://iraqbid_user:IraqBid2026SecurePass!@127.0.0.1:5432/iraqbid_production'
});

async function testApplyCoupon() {
  console.log("=== Testing Apply Coupon for Order 13 (iPhone 15) ===");
  try {
    const token = jwt.sign(
      { id: 10, role: 'company_products', phone: '+9647700914000' },
      process.env.JWT_SECRET
    );

    console.log("Applying NOOR10 on order 13...");
    const res = await axios.post('http://127.0.0.1:5055/api/coupons/apply', {
      coupon_code: 'NOOR10',
      order_id: 13,
      product_id: 8
    }, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log("Success:", res.data);
  } catch (err) {
    console.error("Error applying coupon:", err.response ? err.response.data : err.message);
  } finally {
    await pool.end();
  }
}

testApplyCoupon();
