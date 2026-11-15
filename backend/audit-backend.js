
import axios from 'axios';
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const API_URL = 'http://72.62.50.86:5000/api';
// const API_URL = 'http://localhost:5000/api'; // Toggle for local testing

const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

const TEST_PHONE = '+9647500000000'; // Specific test number

async function runAudit() {
    console.log(`🔍 [AUDIT] Starting Backend Audit against ${API_URL}...\n`);

    try {
        // =================================================================
        // 1. PUBLIC ENDPOINTS
        // =================================================================

        // --- Categories ---
        console.log('👉 Testing GET /categories...');
        try {
            const catRes = await axios.get(`${API_URL}/categories`);
            if (catRes.data.success === true && Array.isArray(catRes.data.data)) {
                console.log('   ✅ Categories OK (Wrapper present, data is array)');
                if (catRes.data.data.length > 0) {
                    console.log(`      Found ${catRes.data.data.length} categories.`);
                } else {
                    console.warn('      ⚠️ Categories array is empty!');
                }
            } else {
                console.error('   ❌ Categories FAILED: Invalid format', catRes.data);
            }
        } catch (e) {
            console.error('   ❌ Categories FAILED:', e.message);
        }

        // --- Banners ---
        console.log('\n👉 Testing GET /banners...');
        try {
            const bannerRes = await axios.get(`${API_URL}/banners`);
            if (bannerRes.data.success === true && Array.isArray(bannerRes.data.data)) {
                console.log('   ✅ Banners OK (Wrapper present, data is array)');
                // Check Image URLs
                const hasBadResult = bannerRes.data.data.some(b => !b.imageUrl || !b.imageUrl.startsWith('http'));
                if (hasBadResult) console.warn('      ⚠️ Some banners have invalid image URLs!');
                else console.log('      All banner images look like valid URLs.');
            } else {
                console.error('   ❌ Banners FAILED: Invalid format', bannerRes.data);
            }
        } catch (e) {
            console.error('   ❌ Banners FAILED:', e.message);
        }

        // --- Public Products ---
        console.log('\n👉 Testing GET /products (Public)...');
        try {
            const prodRes = await axios.get(`${API_URL}/products`);

            // CRITICAL CHECK: Wrapper
            if (prodRes.data.success === true && Array.isArray(prodRes.data.data)) {
                console.log('   ✅ Products OK (Wrapper present, data is array)');

                const products = prodRes.data.data;
                if (products.length > 0) {
                    const p = products[0];
                    console.log('   🔍 Inspecting first product for Types & URLs:');

                    // Type Checks
                    const idIsInt = Number.isInteger(p.id);
                    const priceIsNum = typeof p.current_price === 'number';
                    const sellerIdType = typeof p.sellerId; // Should be number or null

                    console.log(`      ID is Integer: ${idIsInt} (${typeof p.id}: ${p.id})`);
                    console.log(`      Price is Number: ${priceIsNum} (${typeof p.current_price}: ${p.current_price})`);
                    console.log(`      SellerID Type: ${sellerIdType} (${p.sellerId})`);

                    if (!idIsInt || !priceIsNum) {
                        console.error('      ❌ TYPE ERROR: IDs or Prices are not numbers! Flutter will crash.');
                    } else {
                        console.log('      ✅ Type Checks Passed.');
                    }

                    // Image URL Check
                    let hasImages = false;
                    if (p.images && Array.isArray(p.images)) hasImages = true;
                    if (!hasImages && p.imageUrl) hasImages = true;

                    /*
                    if (p.imageUrl && !p.imageUrl.startsWith('http')) {
                         console.warn(`      ⚠️ Image URL might be local: ${p.imageUrl}`);
                    } else {
                         console.log(`      ✅ Image URL looks absolute: ${p.imageUrl}`);
                    }
                    */
                } else {
                    console.warn('      ⚠️ No products found to inspect.');
                }

            } else {
                console.error('   ❌ Products FAILED: Missing wrapper or invalid format!', Object.keys(prodRes.data));
            }
        } catch (e) {
            console.error('   ❌ Products FAILED:', e.message);
        }


        // =================================================================
        // 2. AUTH FLOW
        // =================================================================
        console.log('\n👉 Testing Auth Flow (Login & Token)...');
        let authToken = null;
        let userId = null;

        try {
            // A. Send OTP
            console.log(`   Sending OTP to ${TEST_PHONE}...`);
            await axios.post(`${API_URL}/auth/send-otp`, { phone: TEST_PHONE });

            // Wait for DB write (2 seconds)
            await new Promise(r => setTimeout(r, 2000));

            // B. Read OTP from DB (Simulating user receiving SMS)
            console.log('   Reading OTP from database...');
            const otpRes = await pool.query("SELECT otp FROM otp_store WHERE phone = $1", [TEST_PHONE]);

            if (otpRes.rows.length === 0) throw new Error("OTP not found in DB");
            const code = otpRes.rows[0].otp;
            console.log(`   ✅ Got OTP Code: ${code}`);

            // C. Verify OTP
            console.log('   Verifying OTP...');
            const verifyRes = await axios.post(`${API_URL}/auth/verify-otp`, {
                phone: TEST_PHONE,
                otp: code
            });

            if (verifyRes.data.success) {
                authToken = verifyRes.data.accessToken;
                userId = verifyRes.data.user.id;
                console.log('   ✅ Login Successful!');
                console.log(`      Token: ${authToken.substring(0, 20)}...`);
                console.log(`      User Role: ${verifyRes.data.user.role}`);
            } else {
                throw new Error("Login failed");
            }

        } catch (e) {
            console.error('   ❌ Auth Flow FAILED:', e.message);
            if (e.response) console.error('      Response:', e.response.data);
        }

        if (authToken) {
            // =================================================================
            // 3. PRIVATE ENDPOINTS
            // =================================================================

            // --- My Products ---
            console.log('\n👉 Testing GET /products/mine (Private)...');
            try {
                const myProdRes = await axios.get(`${API_URL}/products/mine`, {
                    headers: { Authorization: `Bearer ${authToken}` }
                });

                if (myProdRes.data.success === true && Array.isArray(myProdRes.data.data)) {
                    console.log('   ✅ My Products OK (Wrapper present)');
                } else {
                    console.error('   ❌ My Products FAILED: Invalid format', myProdRes.data);
                }
            } catch (e) {
                console.error('   ❌ My Products FAILED:', e.message);
            }

            // --- Create Product ---
            console.log('\n👉 Testing POST /products/create (Private)...');
            try {
                const newProduct = {
                    title: "Audit Test Product " + Date.now(),
                    description: "Created by automated audit script",
                    startingPrice: 100,
                    duration: 1,
                    category_id: 18, // Assuming 18 exists (Electronics?)
                    images: ["https://via.placeholder.com/150"],
                    image_url: "https://via.placeholder.com/150"
                };

                const createRes = await axios.post(`${API_URL}/products/create`, newProduct, {
                    headers: { Authorization: `Bearer ${authToken}` }
                });

                if (createRes.data.success === true) {
                    console.log('   ✅ Create Product OK');
                    console.log(`      Created Product ID: ${createRes.data.data.id}`);
                } else {
                    console.error('   ❌ Create Product FAILED:', createRes.data);
                }
            } catch (e) {
                console.error('   ❌ Create Product FAILED:', e.message);
                if (e.response) console.error('      Response:', e.response.data);
            }
        }

    } catch (err) {
        console.error('🔥 FATAL AUDIT ERROR:', err);
    } finally {
        await pool.end();
        console.log('\n🏁 Audit Complete.');
    }
}

runAudit();
