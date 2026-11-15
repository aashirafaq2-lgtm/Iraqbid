
import axios from 'axios';

async function verifyNewEndpoints() {
    const baseURL = 'https://api.mazaadati.com/api';
    console.log('=== VERIFYING NEW PRODUCT ENDPOINTS ===\n');

    try {
        // 1. Company Products
        console.log('1️⃣  GET /api/company/products');
        const companyRes = await axios.get(`${baseURL}/company/products`);
        console.log(`   Found: ${companyRes.data.data.length} products`);
        const companyMixed = companyRes.data.data.filter(p => p.productSource !== 'company');
        if (companyMixed.length > 0) {
            console.log('   ❌ FAIL: Found non-company products!');
            companyMixed.forEach(p => console.log(`      - ${p.title} (${p.productSource})`));
        } else {
            console.log('   ✅ PASS: Returns ONLY company products');
        }
        console.log('');

        // 2. Marketplace Products (Seller)
        console.log('2️⃣  GET /api/seller/products');
        const sellerRes = await axios.get(`${baseURL}/seller/products`);
        console.log(`   Found: ${sellerRes.data.data.length} products`);
        const sellerMixed = sellerRes.data.data.filter(p => p.productSource !== 'seller');
        if (sellerMixed.length > 0) {
            console.log('   ❌ FAIL: Found non-seller products!');
            sellerMixed.forEach(p => console.log(`      - ${p.title} (${p.productSource})`));
        } else {
            console.log('   ✅ PASS: Returns ONLY seller products');
        }
        console.log('');

        // 3. Direct Query Test (Debug)
        console.log('3️⃣  GET /api/products?source=seller (Direct)');
        const directRes = await axios.get(`${baseURL}/products?source=seller`);
        console.log(`   Found: ${directRes.data.data.length} products`);
        const directMixed = directRes.data.data.filter(p => p.productSource !== 'seller');
        if (directMixed.length > 0) {
            console.log('   ❌ FAIL: Direct query failed!');
        } else {
            console.log('   ✅ PASS: Direct query works');
        }
        console.log('');

        // 4. Compare with General Feed
        console.log('4️⃣  COMPARISON');
        const allRes = await axios.get(`${baseURL}/products`);
        console.log(`   Total products (feed): ${allRes.data.data.length}`);

        const totalCalculated = companyRes.data.data.length + sellerRes.data.data.length;
        if (allRes.data.data.length === totalCalculated) {
            console.log('   ✅ PASS: Total matches sum of parts');
        } else {
            console.log(`   ⚠️ WARNING: Total (${allRes.data.data.length}) != Sum (${totalCalculated})`);
            // This might happen if 'approved' vs 'pending' logic differs or if pagination cuts off
        }

    } catch (error) {
        console.error('❌ Error verifying endpoints:', error.message);
        if (error.response) {
            console.error('   Status:', error.response.status);
            console.error('   Data:', JSON.stringify(error.response.data).substring(0, 200));
        }
    }
}

verifyNewEndpoints();
