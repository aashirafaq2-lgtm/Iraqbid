
import axios from 'axios';

async function testProducts() {
    try {
        const response = await axios.get('https://api.mazaadati.com/api/products?source=seller');
        console.log('✅ Success! Data length:', response.data.data?.length);
        if (response.data.data && response.data.data.length > 0) {
            console.log('First product sample:', JSON.stringify(response.data.data[0], null, 2));
        } else {
            console.log('Response body:', JSON.stringify(response.data, null, 2));
        }
    } catch (error) {
        console.error('❌ Error:', error.response?.data || error.message);
    }
}

testProducts();
