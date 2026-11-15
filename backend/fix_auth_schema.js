import pool from "./src/config/db.js";

async function fixSchema() {
    console.log("🛠️ Starting Authentication Schema Fix...");

    try {
        // 1. Create otp_codes table
        console.log("📦 Creating otp_codes table...");
        await pool.query(`
            CREATE TABLE IF NOT EXISTS otp_codes (
                id SERIAL PRIMARY KEY,
                phone_number VARCHAR(20) NOT NULL,
                otp_code VARCHAR(10) NOT NULL,
                expires_at TIMESTAMP NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            CREATE INDEX IF NOT EXISTS idx_otp_codes_phone ON otp_codes(phone_number);
        `);

        // 2. Update users table with is_verified
        console.log("👥 Updating users table...");
        await pool.query(`
            DO $$ 
            BEGIN
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='is_verified') THEN
                    ALTER TABLE users ADD COLUMN is_verified BOOLEAN DEFAULT FALSE;
                END IF;
            END $$;
        `);

        console.log("✅ Schema updated successfully!");
    } catch (error) {
        console.error("❌ Error updating schema:", error);
    } finally {
        process.exit(0);
    }
}

fixSchema();
