-- Migration 016: Wishlist, User Verification, and Withdrawals
DO $$
BEGIN
  -- 1. Add is_verified to users
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'is_verified'
  ) THEN
    ALTER TABLE users ADD COLUMN is_verified BOOLEAN DEFAULT false;
    RAISE NOTICE '✅ Added is_verified column to users table';
  END IF;

  -- 2. Create wishlist table
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'wishlist') THEN
    CREATE TABLE wishlist (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, product_id)
    );
    CREATE INDEX idx_wishlist_user_id ON wishlist(user_id);
    RAISE NOTICE '✅ Created wishlist table';
  END IF;

  -- 3. Create withdrawals table
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'withdrawals') THEN
    CREATE TABLE withdrawals (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      amount DECIMAL(12, 2) NOT NULL,
      status VARCHAR(20) DEFAULT 'pending', -- pending, completed, failed, rejected
      payment_method VARCHAR(50), -- cash, bank, mobile_money
      payment_details TEXT,
      rejection_reason TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      processed_at TIMESTAMP,
      admin_id INTEGER REFERENCES users(id)
    );
    CREATE INDEX idx_withdrawals_user_id ON withdrawals(user_id);
    RAISE NOTICE '✅ Created withdrawals table';
  END IF;

  -- 4. Enable pg_trgm for fuzzy search
  -- EXECUTE 'CREATE EXTENSION IF NOT EXISTS pg_trgm';
  -- RAISE NOTICE '✅ Enabled pg_trgm extension';

END $$;
