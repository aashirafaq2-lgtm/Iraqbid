-- Migration: Add Notifications and Referrer ID
-- Description: Adds notifications table and referrer_id to users table

BEGIN;

-- 1. Add referrer_id to users table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'referrer_id'
  ) THEN
    ALTER TABLE users ADD COLUMN referrer_id INTEGER REFERENCES users(id) ON DELETE SET NULL;
    RAISE NOTICE '✅ Added referrer_id column to users table';
  ELSE
    RAISE NOTICE '✅ referrer_id column already exists';
  END IF;
END $$;

-- 2. Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  type VARCHAR(50) NOT NULL, -- 'bid_placed', 'outbid', 'auction_won', 'product_approved', 'product_rejected', 'auction_ended'
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);

COMMIT;
