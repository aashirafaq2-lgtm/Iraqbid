import fetch from 'node-fetch';

async function testAll() {
  const base = 'http://127.0.0.1:5055/api';
  console.log('Testing 4-tier admin login...');

  // 1. Login superadmin
  const saRes = await fetch(`${base}/admin/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'superadmin@iraqbid.com', password: 'Admin@IraqBid2026!' })
  });
  const saData = await saRes.json();
  console.log('SUPERADMIN_LOGIN:', saData.success ? 'SUCCESS (Role: ' + saData.admin?.role + ')' : saData);

  if (!saData.token) {
    console.error('Superadmin login failed!');
    process.exit(1);
  }

  const saToken = saData.token;

  // 2. Fetch staff list
  const staffRes = await fetch(`${base}/admin/staff`, {
    headers: { 'Authorization': `Bearer ${saToken}` }
  });
  const staffData = await staffRes.json();
  console.log('STAFF_COUNT:', staffData.staff?.length);

  // 3. Test Rate Limiter (Brute force protection: 5 bad attempts)
  console.log('Testing security rate limiter...');
  for (let i = 1; i <= 6; i++) {
    const badRes = await fetch(`${base}/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'fake@example.com', password: 'wrong' })
    });
    const badData = await badRes.json();
    console.log(`Attempt ${i} Status: ${badRes.status} - ${badData.message || badData.error}`);
  }

  process.exit(0);
}

testAll().catch(e => { console.error('FATAL:', e); process.exit(1); });

