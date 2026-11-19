require('dotenv').config({ path: '/var/www/bid-backend/Bid-app-Backend/.env' });
const axios = require('axios');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret_key_here_change_in_production_min_32_chars';
const BASE_URL = 'http://127.0.0.1:5055';

// Generate admin token with real superadmin from DB
const adminToken = jwt.sign(
  { id: 8, phone: '+9647500914000', role: 'superadmin', scope: 'admin' },
  JWT_SECRET,
  { expiresIn: '7d' }
);

const headers = { Authorization: 'Bearer ' + adminToken };

async function runTest(iteration) {
  console.log('\n========================================');
  console.log('  RUNNING ITERATION #' + iteration + ' OF 10');
  console.log('========================================');

  const tests = [
    { name: '1. Dashboard (KPI & Metrics)', url: '/api/enterprise/dashboard/kpi', method: 'get' },
    { name: '2. Inventory Management (Products List)', url: '/api/enterprise/inventory', method: 'get' },
    { name: '3. Barcode Management (Barcodes Register)', url: '/api/enterprise/barcodes', method: 'get' },
    { name: '4. Live Auction Management (Active Auctions)', url: '/api/admin/auctions/active', method: 'get' },
    { name: '4. Pending Auction Products', url: '/api/admin/products/pending', method: 'get' },
    { name: '5. Customers & CRM (Users List)', url: '/api/admin/users', method: 'get' },
    { name: '5. Special Bidders (Profiles)', url: '/api/special-bidders', method: 'get' },
    { name: '5. Special Bidders (Audit History)', url: '/api/special-bidders/history/logs', method: 'get' },
    { name: '5. Daily Challenge & Referral Growth Hub', url: '/api/enterprise/referrals/stats', method: 'get' },
    { name: '5. Daily Challenge (Mobile Endpoint)', url: '/api/challenge/daily', method: 'get' },
    { name: '5. Lucky Wheel (Mobile Status)', url: '/api/wheel/status', method: 'get' },
    { name: '6. Winners & Orders', url: '/api/admin/orders', method: 'get' },
    { name: '7. Shipping Management (Refusals & Strikes)', url: '/api/enterprise/customers/refusals', method: 'get' },
    { name: '8. Customer Order Labels (Order Data)', url: '/api/admin/orders', method: 'get' },
    { name: '9. Stock Audit (Barcode Reconciliation)', url: '/api/enterprise/audit/reconcile', method: 'post', data: { scanned_barcodes: [] } },
    { name: '10. Employees & Permissions (Staff List)', url: '/api/admin/staff', method: 'get' },
    { name: '11. Reports Hub (Data Feeds)', url: '/api/enterprise/inventory', method: 'get' },
    { name: '12. Coupons Management (Coupons List)', url: '/api/coupons/admin', method: 'get' },
    { name: '12. Coupons Transactions (Audit Trail)', url: '/api/coupons/admin/transactions', method: 'get' },
    { name: '12. Influencer Performance Leaderboard', url: '/api/coupons/admin/performance', method: 'get' },
    { name: '13. Activity & Security Audit Trail', url: '/api/enterprise/logs/activity', method: 'get' },
    { name: '14. Mobile Slideshow & Banners', url: '/api/banners', method: 'get' },
    { name: '15. System Settings', url: '/api/enterprise/settings', method: 'get' },
    { name: 'Mobile Buyer Won Items (Wons Screen)', url: '/api/buyer/bidding-history?status=won', method: 'get' },
    { name: 'Web Referral Landing Page (App Store Fallback)', url: '/join?ref=IQBTEST&source=challenge', method: 'get' }
  ];

  let passed = 0;
  let failed = 0;

  for (const t of tests) {
    try {
      const res = await axios({
        method: t.method,
        url: BASE_URL + t.url,
        data: t.data || {},
        headers,
        timeout: 5000
      });
      if (res.status === 200) {
        passed++;
      } else {
        console.error('❌ ' + t.name + ' failed with status ' + res.status);
        failed++;
      }
    } catch (err) {
      console.error('❌ ' + t.name + ' Error: ' + (err.response?.status || err.message));
      failed++;
    }
  }

  // --- Dynamic Mutations in each cycle ---

  // A. Special Bidder Profile Creation
  try {
    const sbRes = await axios.post(BASE_URL + '/api/special-bidders', {
      name: 'Test Bidder It' + iteration,
      unique_id: 'SB-TEST-' + iteration + '-' + Date.now(),
      is_active: true
    }, { headers });
    if (sbRes.data.success) {
      passed++;
    } else {
      console.error('❌ Special bidder create failed:', sbRes.data);
      failed++;
    }
  } catch (e) {
    console.error('❌ Special bidder create error:', e.message);
    failed++;
  }

  // B. Lucky Wheel Spin & Quota Validation
  try {
    const spinRes = await axios.post(BASE_URL + '/api/wheel/spin', {}, { headers });
    if (spinRes.data.success || spinRes.data.message === 'No spins remaining for today') {
      passed++;
    } else {
      console.error('❌ Wheel spin failed:', spinRes.data);
      failed++;
    }
  } catch (e) {
    if (e.response && (e.response.status === 400 && (e.response.data?.error === 'no_spins_left' || e.response.data?.message?.toLowerCase().includes('no spins')))) {
      // Quota correctly enforced by server
      passed++;
    } else {
      console.error('❌ Wheel spin error:', e.message);
      failed++;
    }
  }

  // C. Influencer Coupon Creation
  try {
    const coupCode = 'AUTO' + iteration + Date.now().toString().slice(-4);
    const cRes = await axios.post(BASE_URL + '/api/coupons/admin', {
      influencer_name: 'Influencer ' + iteration,
      coupon_code: coupCode,
      discount_percentage: 10,
      max_discount_amount: 50,
      is_active: true
    }, { headers });
    if (cRes.data.success) {
      passed++;
    } else {
      console.error('❌ Coupon create failed:', cRes.data);
      failed++;
    }
  } catch (e) {
    console.error('❌ Coupon create error:', e.response?.data?.message || e.message);
    failed++;
  }

  // D. OTP Flow (Send & Verify with developer bypass)
  try {
    const testPhone = '+9647700914000';
    const otpSendRes = await axios.post(BASE_URL + '/api/auth/send-otp', {
      phone: testPhone,
      type: 'login'
    });
    if (otpSendRes.data.success) {
      passed++;
    } else {
      console.error('❌ OTP send failed:', otpSendRes.data);
      failed++;
    }

    const otpVerifyRes = await axios.post(BASE_URL + '/api/auth/verify-otp', {
      phone: testPhone,
      otp: '123456',
      type: 'login'
    });
    if (otpVerifyRes.data.success) {
      passed++;
    } else {
      console.error('❌ OTP verify failed:', otpVerifyRes.data);
      failed++;
    }
  } catch (e) {
    console.error('❌ OTP flow error:', e.response?.data?.message || e.message);
    failed++;
  }

  console.log('Iteration #' + iteration + ' Results: ' + passed + ' PASSED, ' + failed + ' FAILED');
  if (failed > 0) throw new Error('Iteration #' + iteration + ' had failures!');
}

async function main() {
  console.log('🚀 Starting 10-cycle exhaustive verification of all 15 Admin Sections & New Features...');
  for (let i = 1; i <= 10; i++) {
    await runTest(i);
  }
  console.log('\n======================================================');
  console.log('✅ ALL 10 ITERATIONS COMPLETED WITH 100% SUCCESS RATE!');
  console.log('======================================================');
  process.exit(0);
}

main().catch(err => {
  console.error('FATAL TEST ERROR:', err.message);
  process.exit(1);
});
