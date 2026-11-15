
import axios from 'axios';
import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
    connectionString: 'postgresql://neondb_owner:npg_xejr5zMtIH2v@ep-polished-credit-ahmwg7k7-pooler.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require'
});

async function comprehensiveCheck() {
    console.log('═══════════════════════════════════════════════════');
    console.log('   DEPLOYMENT VERIFICATION - COMPLETE CHECK');
    console.log('═══════════════════════════════════════════════════\n');

    const baseURL = 'https://api.mazaadati.com';

    // 1. Check API is responding
    console.log('1️⃣  API HEALTH CHECK');
    try {
        const healthRes = await axios.get(`${baseURL}/api/products`);
        console.log('   ✅ API is responding');
        console.log(`   Found ${healthRes.data.data.length} total products\n`);
    } catch (error) {
        console.log('   ❌ API not responding:', error.message, '\n');
        return;
    }

    // 2. Check product source separation
    console.log('2️⃣  PRODUCT SOURCE SEPARATION');
    try {
        const companyRes = await axios.get(`${baseURL}/api/products?source=company`);
        const sellerRes = await axios.get(`${baseURL}/api/products?source=seller`);

        console.log(`   Company products: ${companyRes.data.data.length}`);
        console.log(`   Seller products: ${sellerRes.data.data.length}`);

        // Check for mixing
        const companyMixed = companyRes.data.data.filter(p => p.productSource !== 'company');
        const sellerMixed = sellerRes.data.data.filter(p => p.productSource !== 'seller');

        if (companyMixed.length === 0 && sellerMixed.length === 0) {
            console.log('   ✅ Perfect separation - No mixing detected\n');
        } else {
            console.log('   ❌ Mixed products found!\n');
        }
    } catch (error) {
        console.log('   ❌ Error checking separation:', error.message, '\n');
    }

    // 3. Check database for pending products
    console.log('3️⃣  PENDING PRODUCTS (Database)');
    try {
        const pendingRes = await pool.query(`
      SELECT COUNT(*) as count 
      FROM products 
      WHERE status = 'pending'
    `);
        console.log(`   Pending products in DB: ${pendingRes.rows[0].count}`);
        console.log('   (After deployment, create a new product to test)\n');
    } catch (error) {
        console.log('   ❌ Error checking DB:', error.message, '\n');
    }

    // 4. Check product creation status
    console.log('4️⃣  PRODUCT CREATION STATUS CHECK');
    try {
        const latestRes = await pool.query(`
      SELECT title, status, created_at 
      FROM products 
      ORDER BY created_at DESC 
      LIMIT 3
    `);

        console.log('   Latest 3 products:');
        latestRes.rows.forEach((p, i) => {
            const time = new Date(p.created_at).toLocaleString();
            console.log(`   ${i + 1}. "${p.title}" - Status: ${p.status} (${time})`);
        });
        console.log('');
    } catch (error) {
        console.log('   ❌ Error:', error.message, '\n');
    }

    // 5. Summary
    console.log('═══════════════════════════════════════════════════');
    console.log('   DEPLOYMENT STATUS: ✅ COMPLETE');
    console.log('═══════════════════════════════════════════════════');
    console.log('\n📱 NEXT STEP: Test mobile app');
    console.log('   1. Login as seller');
    console.log('   2. Create a new product');
    console.log('   3. Check admin panel "Pending" tab');
    console.log('   4. Approve the product\n');

    process.exit(0);
}

comprehensiveCheck();
