
import axios from 'axios';

async function testSourceFiltering() {
    const url = 'https://api.mazaadati.com/api/products';

    try {
        console.log('--- Testing source=company ---');
        const companyRes = await axios.get(`${url}?source=company`);
        const companyProducts = companyRes.data.data;
        console.log('Found:', companyProducts.length, 'products');
        const companyMixed = companyProducts.filter(p => p.sellerId !== null);
        if (companyMixed.length > 0) {
            console.log('❌ ERROR: Found seller products in company list!');
            console.log('Sample mixed product:', companyMixed[0]);
        } else {
            console.log('✅ OK: All products are company products (sellerId is NULL)');
        }

        console.log('\n--- Testing source=seller ---');
        const sellerRes = await axios.get(`${url}?source=seller`);
        const sellerProducts = sellerRes.data.data;
        console.log('Found:', sellerProducts.length, 'products');
        const sellerMixed = sellerProducts.filter(p => p.sellerId === null);
        if (sellerMixed.length > 0) {
            console.log('❌ ERROR: Found company products in seller list!');
            console.log('Sample mixed product:', sellerMixed[0]);
        } else {
            console.log('✅ OK: All products are seller products (sellerId is NOT NULL)');
        }
    } catch (error) {
        console.error('Error:', error.message);
    }
}

testSourceFiltering();
