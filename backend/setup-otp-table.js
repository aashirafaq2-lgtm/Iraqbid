
import pool from './src/config/db.js';

async function setupOTPTable() {
    console.log("🔌 Checking database for otp_store table...");
    try {
        const query = `
            CREATE TABLE IF NOT EXISTS otp_store (
                id SERIAL PRIMARY KEY,
                phone VARCHAR(20) NOT NULL UNIQUE,
                otp VARCHAR(10) NOT NULL,
                expires_at TIMESTAMP NOT NULL,
                verified BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            CREATE INDEX IF NOT EXISTS idx_otp_phone ON otp_store(phone);
        `;
        await pool.query(query);
        console.log("✅ Table 'otp_store' is ready and up to date!");
        process.exit(0);
    } catch (error) {
        console.error("❌ Error setting up table:", error);
        process.exit(1);
    }
}

setupOTPTable();
