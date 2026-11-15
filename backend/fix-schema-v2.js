
import pool from './src/config/db.js';

async function fixSchema() {
    try {
        console.log('🛠️ Adding missing columns to notifications table...');
        await pool.query(`
      ALTER TABLE notifications 
      ADD COLUMN IF NOT EXISTS type VARCHAR(50) DEFAULT 'general',
      ALTER COLUMN title DROP NOT NULL;
    `);
        console.log('✅ Notifications table updated.');

        console.log('🛠️ Adding missing columns to users table...');
        await pool.query(`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS referral_code VARCHAR(50),
      ADD COLUMN IF NOT EXISTS reward_balance NUMERIC DEFAULT 0;
    `);
        console.log('✅ Users table updated.');

        process.exit(0);
    } catch (err) {
        console.error('❌ Error fixing schema:', err.message);
        process.exit(1);
    }
}

fixSchema();
