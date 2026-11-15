
import axios from 'axios';

async function testLiveAPI() {
    const baseURL = 'https://api.mazaadati.com';

    console.log('=== TESTING MOBILE API (PUBLIC) ===\n');

    try {
        // Test 1: Get ALL products (no filter)
        console.log('1. ALL PRODUCTS (no filter):');
        const allRes = await axios.get(`${baseURL}/api/products`);
        console.log(`   Found: ${allRes.data.data.length} products`);
        const allSources = {};
        allRes.data.data.forEach(p => {
            allSources[p.productSource] = (allSources[p.productSource] || 0) + 1;
        });
        console.log('   Sources:', allSources);

        // Test 2: Company products
        console.log('\n2. COMPANY PRODUCTS (source=company):');
        const compRes = await axios.get(`${baseURL}/api/products?source=company`);
        console.log(`   Found: ${compRes.data.data.length} products`);
        const companyMixed = compRes.data.data.filter(p => p.productSource !== 'company');
        if (companyMixed.length > 0) {
            console.log('   ❌ PROBLEM: Found non-company products:');
            companyMixed.forEach(p => {
                console.log(`      - ${p.title} (Source: ${p.productSource}, SellerID: ${p.sellerId})`);
            });
        } else {
            console.log('   ✅ All products correctly tagged as company');
        }

        // Test 3: Seller products
        console.log('\n3. SELLER PRODUCTS (source=seller):');
        const sellerRes = await axios.get(`${baseURL}/api/products?source=seller`);
        console.log(`   Found: ${sellerRes.data.data.length} products`);
        const sellerMixed = sellerRes.data.data.filter(p => p.productSource !== 'seller');
        if (sellerMixed.length > 0) {
            console.log('   ❌ PROBLEM: Found non-seller products:');
            sellerMixed.forEach(p => {
                console.log(`      - ${p.title} (Source: ${p.productSource}, SellerID: ${p.sellerId})`);
            });
        } else {
            console.log('   ✅ All products correctly tagged as seller');
        }

        // Show first 3 from each
        console.log('\n4. SAMPLE DATA:');
        console.log('\nCompany products (first 3):');
        compRes.data.data.slice(0, 3).forEach((p, i) => {
            console.log(`   ${i + 1}. ${p.title} - Source: ${p.productSource}, SellerID: ${p.sellerId}`);
        });

        console.log('\nSeller products (first 3):');
        sellerRes.data.data.slice(0, 3).forEach((p, i) => {
            console.log(`   ${i + 1}. ${p.title} - Source: ${p.productSource}, SellerID: ${p.sellerId}`);
        });

    } catch (error) {
        console.error('❌ Error:', error.message);
        if (error.response) {
            console.error('Response status:', error.response.status);
            console.error('Response data:', error.response.data);
        }
    }
}

testLiveAPI();
