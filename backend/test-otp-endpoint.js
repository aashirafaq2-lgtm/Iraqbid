
import axios from 'axios';

async function testOTP() {
    try {
        const response = await axios.post('https://api.mazaadati.com/api/auth/send-otp', {
            phone: '+9647708504000'
        });
        console.log('✅ Success:', response.data);
    } catch (error) {
        console.error('❌ Error:', error.response?.data || error.message);
    }
}

testOTP();
