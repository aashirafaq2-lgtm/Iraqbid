-- Migration: Add auction_processed flag to products
-- Description: Adds auction_processed boolean to track end-of-auction processing

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'products' AND column_name = 'auction_processed'
  ) THEN
    ALTER TABLE products ADD COLUMN auction_processed BOOLEAN DEFAULT FALSE;
    RAISE NOTICE '✅ Added auction_processed column to products table';
  ELSE
    RAISE NOTICE '✅ auction_processed column already exists';
  END IF;
  
  -- Create index for faster checking
  CREATE INDEX IF NOT EXISTS idx_products_auction_processed ON products(auction_processed);
END $$;
