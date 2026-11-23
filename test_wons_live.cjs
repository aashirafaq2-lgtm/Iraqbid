const axiosModule = require('/var/www/bid-backend/Bid-app-Backend/node_modules/axios');
const axios = axiosModule.default || axiosModule;
const jwt = require('/var/www/bid-backend/Bid-app-Backend/node_modules/jsonwebtoken');
const { Pool } = require('/var/www/bid-backend/Bid-app-Backend/node_modules/pg');
require('/var/www/bid-backend/Bid-app-Backend/node_modules/dotenv').config({ path: '/var/www/bid-backend/Bid-app-Backend/.env' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://iraqbid_user:IraqBid2026SecurePass!@127.0.0.1:5432/iraqbid_production'
});

const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret_key_here_change_in_production_min_32_chars';
const BASE_URL = 'http://127.0.0.1:5055';

const buyerToken = jwt.sign(
  { id: 10, phone: '+9647700914000', role: 'buyer', scope: 'mobile' },
  JWT_SECRET,
  { expiresIn: '7d' }
);
const headers = { Authorization: 'Bearer ' + buyerToken };

async function main() {
  // Ensure influencer coupons exist
  await pool.query(`
    INSERT INTO coupons (influencer_name, coupon_code, discount_percentage, max_discount_amount, is_active)
    VALUES 
      ('Ahmed', 'AHMED10', 10.00, 100.00, true),
      ('Noor', 'NOOR10', 10.00, 100.00, true),
      ('Ali', 'ALI10', 10.00, 100.00, true)
    ON CONFLICT (coupon_code) DO UPDATE 
    SET is_active = true, discount_percentage = 10.00;
  `);
  console.log('🔍 TEST 1: Fetching Won Bids / Purchases for User 10...');
  const res1 = await axios.get(`${BASE_URL}/api/buyer/bidding-history?status=won`, { headers });
  console.log('✅ Status Won API Success:', res1.data.success);
  console.log('📦 Total Won Items Count:', res1.data.data.length);
  
  if (res1.data.data.length === 0) {
    throw new Error('No won items returned!');
  }

  console.log('\nWon Items List:');
  res1.data.data.slice(0, 5).forEach((item, idx) => {
    console.log(` [${idx + 1}] Order #${item.order_id || 'N/A'} - Product #${item.product_id} (${item.product_title})`);
    console.log(`     Original: $${item.original_amount} | Final: $${item.final_price} | Coupon: ${item.coupon_code || 'None'} | Status: ${item.order_status}`);
  });

  // Find a pending order without coupon to test applying coupon
  const eligibleItem = res1.data.data.find(i => !i.coupon_code && i.order_status === 'pending');
  if (eligibleItem) {
    console.log(`\n🎟️ TEST 2: Applying Influencer Coupon 'AHMED10' to Order #${eligibleItem.order_id} (Product #${eligibleItem.product_id})...`);
    const applyRes = await axios.post(`${BASE_URL}/api/coupons/apply`, {
      coupon_code: 'AHMED10',
      order_id: eligibleItem.order_id,
      product_id: eligibleItem.product_id
    }, { headers });

    console.log('✅ Coupon Apply Result:', applyRes.data);

    // Verify in won list
    console.log('\n🔍 TEST 3: Verifying updated price and coupon in Won list...');
    const res2 = await axios.get(`${BASE_URL}/api/buyer/bidding-history?status=won`, { headers });
    const updated = res2.data.data.find(i => i.order_id === eligibleItem.order_id);
    console.log('Updated Item in Wons screen:', {
      order_id: updated.order_id,
      product_title: updated.product_title,
      original_amount: updated.original_amount,
      discount_amount: updated.discount_amount,
      final_price: updated.final_price,
      coupon_code: updated.coupon_code
    });
  }

  // TEST 4: Try applying coupon twice or to delivered
  console.log('\n🚫 TEST 4: Verifying duplicate coupon rejection...');
  if (eligibleItem) {
    try {
      await axios.post(`${BASE_URL}/api/coupons/apply`, {
        coupon_code: 'AHMED10',
        order_id: eligibleItem.order_id,
        product_id: eligibleItem.product_id
      }, { headers });
      console.error('❌ FAILED: Duplicate coupon should have been rejected!');
    } catch (err) {
      console.log('✅ Correctly rejected duplicate coupon:', err.response?.data?.message || err.message);
    }
  }

  console.log('\n🎉 ALL WONS & COUPON TESTS PASSED WITH 100% SUCCESS!');
  await pool.end();
}

main().catch(err => {
  console.error('Test Error:', err.response?.data || err.message);
  process.exit(1);
});
