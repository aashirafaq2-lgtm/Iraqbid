import pool from '/var/www/bid-backend/Bid-app-Backend/src/config/db.js';

async function testPub() {
  const itemRes = await pool.query("SELECT id FROM inventory_items WHERE barcode = 'IQB-TEST01'");
  if (itemRes.rows.length === 0) return;
  const id = itemRes.rows[0].id;

  const res = await fetch('http://127.0.0.1:5055/api/enterprise/auctions/publish', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      inventory_id: id,
      duration_hours: 24
    })
  });
  const data = await res.json();
  console.log('DIRECT_PUBLISH_RESULT:', res.status, data);

  // Check active auctions
  const actRes = await fetch('http://127.0.0.1:5055/api/admin/auctions/active');
  const actData = await actRes.json();
  console.log('ACTIVE_AUCTIONS_COUNT:', Array.isArray(actData) ? actData.length : actData.data?.length);

  process.exit(0);
}

testPub();

