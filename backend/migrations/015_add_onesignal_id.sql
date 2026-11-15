-- Migration 015: Add onesignal_id to users table for push notifications
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'onesignal_id'
  ) THEN
    ALTER TABLE users ADD COLUMN onesignal_id VARCHAR(255);
    CREATE INDEX idx_users_onesignal_id ON users(onesignal_id);
    RAISE NOTICE '✅ Added onesignal_id column to users table';
  ELSE
    RAISE NOTICE '⚠️  onesignal_id column already exists';
  END IF;
END $$;
