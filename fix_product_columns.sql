-- Add missing columns to products table for complete compatibility
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='products' AND column_name='product_source') THEN
    ALTER TABLE products ADD COLUMN product_source VARCHAR(50) DEFAULT 'company';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='products' AND column_name='real_price') THEN
    ALTER TABLE products ADD COLUMN real_price NUMERIC(10,2) DEFAULT 0;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='products' AND column_name='original_retail_price') THEN
    ALTER TABLE products ADD COLUMN original_retail_price NUMERIC(10,2) DEFAULT 0;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='products' AND column_name='buy_now_price') THEN
    ALTER TABLE products ADD COLUMN buy_now_price NUMERIC(10,2) DEFAULT 0;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='products' AND column_name='special_description') THEN
    ALTER TABLE products ADD COLUMN special_description TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='products' AND column_name='condition') THEN
    ALTER TABLE products ADD COLUMN condition VARCHAR(50) DEFAULT 'New';
  END IF;
END $$;
