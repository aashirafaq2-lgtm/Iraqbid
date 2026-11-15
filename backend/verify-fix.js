
import axios from 'axios';

async function verifySeparation() {
    const url = 'https://api.mazaadati.com/api/products';

    try {
        console.log('--- Testing source=seller ---');
        const res = await axios.get(`${url}?source=seller`);
        const products = res.data.data;
        console.log('Found:', products.length, 'products');

        // In my new logic, seller list should exclusively have productSource === 'seller'
        const mixed = products.filter(p => p.productSource !== 'seller');
        if (mixed.length > 0) {
            console.log('❌ FAILED: Found non-seller products in seller list!');
            console.log('First mixed item:', mixed[0].title, 'Source:', mixed[0].productSource);
        } else {
            console.log('✅ PASSED: Strictly seller products found.');
        }

        console.log('\n--- Testing source=company ---');
        const cres = await axios.get(`${url}?source=company`);
        const cproducts = cres.data.data;
        console.log('Found:', cproducts.length, 'products');

        const cmixed = cproducts.filter(p => p.productSource !== 'company');
        if (cmixed.length > 0) {
            console.log('❌ FAILED: Found non-company products in company list!');
            console.log('First mixed item:', cmixed[0].title, 'Source:', cmixed[0].productSource);
        } else {
            console.log('✅ PASSED: Strictly company products found.');
        }
    } catch (err) {
        console.error(err.message);
    }
}

verifySeparation();
