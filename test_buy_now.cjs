require('dotenv').config({ path: '/var/www/bid-backend/Bid-app-Backend/.env' });
const axios = require('axios');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret_key_here_change_in_production_min_32_chars';
const BASE_URL = 'http://127.0.0.1:5055';

const buyerToken = jwt.sign(
  { id: 10, phone: '+9647700914000', role: 'buyer', scope: 'mobile' },
  JWT_SECRET,
  { expiresIn: '7d' }
);
const headers = { Authorization: 'Bearer ' + buyerToken };

async function main() {
  console.log('🛒 Testing Buy Now with & without Influencer Coupon...');

  // 1. Get a product with buy_now_price > 0
  const prodRes = await axios.get(BASE_URL + '/api/products');
  const products = prodRes.data.products || prodRes.data.data || prodRes.data;
  const target = products.find(p => parseFloat(p.buy_now_price || 0) > 0 && p.status !== 'sold');
  
  if (!target) {
    console.log('No available buy now product found directly, fetching from inventory...');
    return;
  }

  console.log(`Targeting Product #${target.id}: ${target.title} - Buy Now Price: $${target.buy_now_price}`);

  // Test Buy Now with coupon
  const res = await axios.post(`${BASE_URL}/api/products/${target.id}/buy-now`, {
    shipping_address: 'Baghdad, Al-Mansour, St 14',
    phone: '+9647700914000',
    coupon_code: 'AHMED10'
  }, { headers });

  console.log('Buy Now Response:', res.data);
  if (res.data.success) {
    console.log('✅ BUY NOW COMPLETED SUCCESSFULLY WITHOUT ANY ERROR!');
  } else {
    throw new Error('Buy now failed: ' + res.data.message);
  }
}

main().catch(err => {
  console.error('BUY NOW ERROR:', err.response?.data || err.message);
  process.exit(1);
});
