-- 017_iraqbid_enterprise_admin.sql
-- Iraq Bid Enterprise Admin Panel, Warehouse Inventory, Barcodes, Auto-Bidding, Orders & Custom Permissions Migration

-- 1. Inventory Items Table (Every physical product has its own unique record)
CREATE TABLE IF NOT EXISTS inventory_items (
  id SERIAL PRIMARY KEY,
  barcode VARCHAR(50) UNIQUE NOT NULL,
  product_name VARCHAR(255) NOT NULL,
  description TEXT,
  images TEXT[] DEFAULT '{}',
  original_retail_price DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  starting_bid_price DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  buy_now_price DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  min_acceptable_price DECIMAL(10,2),
  actual_acquisition_cost DECIMAL(10,2),
  auto_bid_increment DECIMAL(10,2) NOT NULL DEFAULT 1.00,
  condition VARCHAR(50) NOT NULL DEFAULT 'New' CHECK (condition IN ('New', 'Like New', 'Used', 'For Parts / Defective')),
  defect_alert BOOLEAN NOT NULL DEFAULT FALSE,
  defect_details TEXT,
  defect_images TEXT[] DEFAULT '{}',
  warehouse_location VARCHAR(100),
  receiving_employee_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  receiving_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  notes TEXT,
  status VARCHAR(50) NOT NULL DEFAULT 'available' CHECK (status IN ('received', 'available', 'in_auction', 'sold', 'unsold', 'delivered', 'damaged', 'missing')),
  published_product_id INTEGER REFERENCES products(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_inventory_barcode ON inventory_items(barcode);
CREATE INDEX IF NOT EXISTS idx_inventory_status ON inventory_items(status);
CREATE INDEX IF NOT EXISTS idx_inventory_published_product ON inventory_items(published_product_id);

-- 2. Barcode Master Register (For unique sequential barcodes e.g. IQB-000001)
CREATE TABLE IF NOT EXISTS barcodes (
  id SERIAL PRIMARY KEY,
  barcode_number VARCHAR(50) UNIQUE NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'unused' CHECK (status IN ('unused', 'assigned', 'printed')),
  assigned_item_id INTEGER REFERENCES inventory_items(id) ON DELETE SET NULL,
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  printed_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_barcodes_number ON barcodes(barcode_number);
CREATE INDEX IF NOT EXISTS idx_barcodes_status ON barcodes(status);

-- Sequence helper table for barcode auto-generation
CREATE TABLE IF NOT EXISTS barcode_sequences (
  id SERIAL PRIMARY KEY,
  prefix VARCHAR(10) NOT NULL DEFAULT 'IQB',
  current_val INTEGER NOT NULL DEFAULT 0
);

INSERT INTO barcode_sequences (prefix, current_val)
SELECT 'IQB', 0
WHERE NOT EXISTS (SELECT 1 FROM barcode_sequences WHERE prefix = 'IQB');

-- 3. Granular Employee Permissions Table (No fixed roles, individual permissions)
CREATE TABLE IF NOT EXISTS employee_permissions (
  id SERIAL PRIMARY KEY,
  employee_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  module VARCHAR(50) NOT NULL CHECK (module IN ('inventory', 'auctions', 'customers', 'orders', 'financial', 'system')),
  can_view BOOLEAN NOT NULL DEFAULT FALSE,
  can_create BOOLEAN NOT NULL DEFAULT FALSE,
  can_edit BOOLEAN NOT NULL DEFAULT FALSE,
  can_delete BOOLEAN NOT NULL DEFAULT FALSE,
  can_approve BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT unique_employee_module UNIQUE (employee_id, module)
);

CREATE INDEX IF NOT EXISTS idx_emp_permissions_emp ON employee_permissions(employee_id);

-- 4. System Automatic Bidder Engine Log
CREATE TABLE IF NOT EXISTS system_auto_bids (
  id SERIAL PRIMARY KEY,
  auction_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  inventory_item_id INTEGER REFERENCES inventory_items(id) ON DELETE SET NULL,
  system_bidder_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  bid_amount DECIMAL(10,2) NOT NULL,
  min_acceptable_price DECIMAL(10,2) NOT NULL,
  is_system_generated BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_system_auto_bids_auction ON system_auto_bids(auction_id);

-- 5. Customer Refusal Tracking & Automatic Ban
CREATE TABLE IF NOT EXISTS customer_refusals (
  id SERIAL PRIMARY KEY,
  customer_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  order_id INTEGER REFERENCES orders(id) ON DELETE SET NULL,
  refusal_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  recorded_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  reason TEXT,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_customer_refusals_customer ON customer_refusals(customer_id);

-- Add ban / refusal fields to users if not present
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='refusal_count') THEN
    ALTER TABLE users ADD COLUMN refusal_count INTEGER NOT NULL DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='is_banned') THEN
    ALTER TABLE users ADD COLUMN is_banned BOOLEAN NOT NULL DEFAULT FALSE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='ban_reason') THEN
    ALTER TABLE users ADD COLUMN ban_reason TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='banned_at') THEN
    ALTER TABLE users ADD COLUMN banned_at TIMESTAMP;
  END IF;
END $$;

-- 6. Customer Order Labels & Exchange Rate Snapshot
CREATE TABLE IF NOT EXISTS customer_order_labels (
  id SERIAL PRIMARY KEY,
  order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE UNIQUE,
  usd_total DECIMAL(10,2) NOT NULL,
  exchange_rate DECIMAL(10,2) NOT NULL DEFAULT 1520.00,
  iqd_total DECIMAL(14,2) NOT NULL,
  shipping_fee_usd DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  printed_count INTEGER NOT NULL DEFAULT 0,
  last_printed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add shipping tracking and receipt confirmation columns to orders table
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='shipping_company') THEN
    ALTER TABLE orders ADD COLUMN shipping_company VARCHAR(100);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='tracking_number') THEN
    ALTER TABLE orders ADD COLUMN tracking_number VARCHAR(100);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='shipping_cost') THEN
    ALTER TABLE orders ADD COLUMN shipping_cost DECIMAL(10,2) DEFAULT 0.00;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='responsible_employee_id') THEN
    ALTER TABLE orders ADD COLUMN responsible_employee_id INTEGER REFERENCES users(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='expected_delivery_date') THEN
    ALTER TABLE orders ADD COLUMN expected_delivery_date TIMESTAMP;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='shipping_notes') THEN
    ALTER TABLE orders ADD COLUMN shipping_notes TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='customer_confirmed_receipt') THEN
    ALTER TABLE orders ADD COLUMN customer_confirmed_receipt BOOLEAN NOT NULL DEFAULT FALSE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='customer_receipt_confirmed_at') THEN
    ALTER TABLE orders ADD COLUMN customer_receipt_confirmed_at TIMESTAMP;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='inventory_item_id') THEN
    ALTER TABLE orders ADD COLUMN inventory_item_id INTEGER REFERENCES inventory_items(id) ON DELETE SET NULL;
  END IF;
END $$;

-- 7. Stock Audit Sessions & Scans
CREATE TABLE IF NOT EXISTS stock_audit_sessions (
  id SERIAL PRIMARY KEY,
  title VARCHAR(150) NOT NULL,
  warehouse_location VARCHAR(100) DEFAULT 'Main Warehouse',
  started_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed', 'approved', 'cancelled')),
  total_expected INTEGER NOT NULL DEFAULT 0,
  total_scanned INTEGER NOT NULL DEFAULT 0,
  total_missing INTEGER NOT NULL DEFAULT 0,
  total_unexpected INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS stock_audit_scans (
  id SERIAL PRIMARY KEY,
  audit_session_id INTEGER NOT NULL REFERENCES stock_audit_sessions(id) ON DELETE CASCADE,
  barcode VARCHAR(50) NOT NULL,
  scanned_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  inventory_item_id INTEGER REFERENCES inventory_items(id) ON DELETE SET NULL,
  is_unexpected BOOLEAN NOT NULL DEFAULT FALSE,
  scanned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT unique_audit_session_barcode UNIQUE (audit_session_id, barcode)
);

-- 8. Enterprise Activity Logs
CREATE TABLE IF NOT EXISTS enterprise_activity_logs (
  id SERIAL PRIMARY KEY,
  employee_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  employee_name VARCHAR(150),
  action_type VARCHAR(100) NOT NULL,
  entity_type VARCHAR(50) NOT NULL,
  entity_id VARCHAR(50),
  previous_status VARCHAR(50),
  new_status VARCHAR(50),
  details JSONB DEFAULT '{}',
  notes TEXT,
  ip_address VARCHAR(45),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_activity_logs_employee ON enterprise_activity_logs(employee_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_action ON enterprise_activity_logs(action_type);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created ON enterprise_activity_logs(created_at);

