
import axios from 'axios';

async function testCreateProduct() {
    const url = 'https://api.mazaadati.com/api';

    try {
        console.log('--- Logging in as Admin ---');
        const loginRes = await axios.post(`${url}/auth/admin-login`, {
            phone: '+9647500914000',
            role: 'superadmin'
        });

        const token = loginRes.data.accessToken || loginRes.data.token;
        console.log('Logged in. Token type:', typeof token);

        // 2. Create a Company Product
        console.log('\n--- Creating Company Product ---');
        const createRes = await axios.post(`${url}/admin/products`, {
            title: 'Auto Live Test Product v5',
            startingPrice: 1000,
            category_id: 8, // Using active category
            duration: 3,
            images: ['https://res.cloudinary.com/df9m0futv/image/upload/v1740000000/sample.jpg']
        }, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        console.log('Response Message:', createRes.data.message);
        const product = createRes.data.product;
        console.log('Product ID:', product.id);
        console.log('Status:', product.status);
        console.log('End Time:', product.auction_end_time);

        // 3. Check /api/products (Marketplace) to see if it's there
        console.log('\n--- Checking Marketplace ---');
        await new Promise(r => setTimeout(r, 2000));

        const productsRes = await axios.get(`${url}/products`);
        const found = productsRes.data.data.find(p => p.id === product.id);
        if (found) {
            console.log('✅ SUCCESS: Product is LIVE in Marketplace!');
            console.log('Found ID:', found.id, 'Title:', found.title, 'Source:', found.productSource);
        } else {
            console.log('❌ FAILURE: Product NOT found in Marketplace.');
            console.log('Latest IDs:', productsRes.data.data.slice(0, 5).map(p => p.id));
        }

    } catch (error) {
        console.error('Error:', error.message);
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Data:', error.response.data);
        }
    }
}

testCreateProduct();
