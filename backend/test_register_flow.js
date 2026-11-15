import fetch from 'node-fetch';

async function testRegister() {
  const base = 'http://127.0.0.1:5055/api';

  // 1. Login
  const loginRes = await fetch(`${base}/admin/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'superadmin@iraqbid.com', password: 'Admin@IraqBid2026!' })
  });
  const loginData = await loginRes.json();
  const token = loginData.token;

  // 2. Test Register with empty optional numeric fields and images
  const testProd = {
    barcode: 'IQB-TEST01',
    product_name: 'Apple iPhone 15 Pro Max 256GB Titanium',
    description: 'Factory sealed device from central warehouse inventory.',
    original_retail_price: '1199.00',
    starting_bid_price: '250.00',
    buy_now_price: '950.00',
    min_acceptable_price: '', // was causing numeric "" crash
    actual_acquisition_cost: '700.00',
    auto_bid_increment: '5.00',
    condition: 'New',
    defect_alert: false,
    defect_details: '',
    images: ['https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=800'],
    warehouse_location: 'Central Shelf Slot A-01'
  };

  const regRes = await fetch(`${base}/enterprise/inventory/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(testProd)
  });

  const regData = await regRes.json();
  console.log('TEST_REGISTER_RESULT:', regRes.status, regData);

  // 3. Test Publishing to Auction
  if (regData.success) {
    const pubRes = await fetch(`${base}/enterprise/auctions/publish`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        inventory_id: regData.data.id,
        duration_hours: 48
      })
    });
    const pubData = await pubRes.json();
    console.log('TEST_PUBLISH_RESULT:', pubRes.status, pubData);
  }

  process.exit(0);
}

testRegister().catch(e => { console.error('ERROR:', e); process.exit(1); });

