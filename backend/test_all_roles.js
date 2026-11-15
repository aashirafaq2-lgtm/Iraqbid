import fetch from 'node-fetch';

async function testRoles() {
  const base = 'http://127.0.0.1:5055/api';

  // 1. Superadmin Login
  const saRes = await fetch(`${base}/admin/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'superadmin@iraqbid.com', password: 'Admin@IraqBid2026!' })
  });
  const saData = await saRes.json();
  console.log('✅ SUPERADMIN_AUTH:', saData.success, 'Role:', saData.admin?.role);

  // 2. Admin Login
  const admRes = await fetch(`${base}/admin/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@iraqbid.com', password: 'Admin@2026!' })
  });
  const admData = await admRes.json();
  console.log('✅ ADMIN_AUTH:', admData.success, 'Role:', admData.admin?.role);

  // 3. Manager Login
  const mgrRes = await fetch(`${base}/admin/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'manager@iraqbid.com', password: 'Manager@2026!' })
  });
  const mgrData = await mgrRes.json();
  console.log('✅ MANAGER_AUTH:', mgrData.success, 'Role:', mgrData.admin?.role);

  // 4. Editor Login
  const edRes = await fetch(`${base}/admin/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'editor@iraqbid.com', password: 'Editor@2026!' })
  });
  const edData = await edRes.json();
  console.log('✅ EDITOR_AUTH:', edData.success, 'Role:', edData.admin?.role);

  // 5. Test Strict Hierarchy Creation: Admin tries to create another Admin (Must be 403 Forbidden)
  const forbiddenRes = await fetch(`${base}/admin/staff`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${admData.token}`
    },
    body: JSON.stringify({
      name: 'Rogue Admin',
      email: 'rogue@iraqbid.com',
      password: 'Pass12345!',
      role: 'admin'
    })
  });
  const forbiddenData = await forbiddenRes.json();
  console.log('🛡️ HIERARCHY SECURITY ENFORCEMENT (Admin creating Admin):');
  console.log('   Status Code:', forbiddenRes.status, '(Expected 403)');
  console.log('   Server Response:', forbiddenData.error || forbiddenData.message);

  process.exit(0);
}

testRoles().catch(e => { console.error('ERROR:', e); process.exit(1); });

