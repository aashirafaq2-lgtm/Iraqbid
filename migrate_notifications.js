const { Pool } = require('/var/www/bid-backend/Bid-app-Backend/node_modules/pg');
require('/var/www/bid-backend/Bid-app-Backend/node_modules/dotenv').config({ path: '/var/www/bid-backend/Bid-app-Backend/.env' });

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function migrate() {
  try {
    console.log('Connecting to database for Notification & FCM tables migration...');

    // 1. user_device_tokens table (Multi-device per user, Android & iOS, FCM tokens)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_device_tokens (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        fcm_token TEXT NOT NULL UNIQUE,
        platform VARCHAR(20) DEFAULT 'android', -- 'android', 'ios', 'web'
        device_name VARCHAR(150),
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_device_tokens_user_id ON user_device_tokens(user_id);
      CREATE INDEX IF NOT EXISTS idx_device_tokens_active ON user_device_tokens(is_active);
    `);
    console.log('✅ user_device_tokens table ready');

    // 2. notification_broadcasts table (Admin Broadcasts History)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS notification_broadcasts (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        image_url TEXT,
        destination_screen VARCHAR(100) DEFAULT 'home', -- 'home', 'auctions', 'product', 'wallet', 'orders'
        related_id VARCHAR(100),
        targeted_count INTEGER DEFAULT 0,
        success_count INTEGER DEFAULT 0,
        failed_count INTEGER DEFAULT 0,
        sent_by_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        sent_by_name VARCHAR(100),
        status VARCHAR(50) DEFAULT 'sent', -- 'sent', 'failed', 'queued'
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_broadcasts_created ON notification_broadcasts(created_at DESC);
    `);
    console.log('✅ notification_broadcasts table ready');

    // 3. Ensure employee permissions has 'notifications' module support
    await pool.query(`
      ALTER TABLE employee_permissions ADD COLUMN IF NOT EXISTS permission_level VARCHAR(50) DEFAULT 'full';
    `);
    console.log('✅ employee_permissions updated');

    console.log('🎉 All notification DB migrations completed successfully!');
  } catch (err) {
    console.error('❌ Migration error:', err);
  } finally {
    await pool.end();
  }
}

migrate();
