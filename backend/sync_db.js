import pool from '/var/www/bid-backend/Bid-app-Backend/src/config/db.js';

async function syncSchema() {
  try {
    console.log('--- ENHANCING DATABASE SCHEMA FOR 100% PERFECT INTEGRATION ---');

    // 1. Add missing enterprise columns to products table if not exist
    const prodCols = [
      "ALTER TABLE products ADD COLUMN IF NOT EXISTS buy_now_price numeric DEFAULT 0.00;",
      "ALTER TABLE products ADD COLUMN IF NOT EXISTS defect_alert boolean DEFAULT false;",
      "ALTER TABLE products ADD COLUMN IF NOT EXISTS defect_details text;",
      "ALTER TABLE products ADD COLUMN IF NOT EXISTS defect_images jsonb DEFAULT '[]'::jsonb;",
      "ALTER TABLE products ADD COLUMN IF NOT EXISTS original_retail_price numeric DEFAULT 0.00;",
      "ALTER TABLE products ADD COLUMN IF NOT EXISTS condition character varying DEFAULT 'New';",
      "ALTER TABLE products ADD COLUMN IF NOT EXISTS source_type character varying DEFAULT 'company';"
    ];
    for (const q of prodCols) {
      await pool.query(q);
    }
    console.log('✅ products table enhanced with buy_now_price, defect_alert, defect_details, etc.');

    // 2. Add total_amount alias/column to orders table if helpful
    await pool.query("ALTER TABLE orders ADD COLUMN IF NOT EXISTS order_number character varying;");
    await pool.query("ALTER TABLE orders ADD COLUMN IF NOT EXISTS final_price numeric;");
    console.log('✅ orders table enhanced.');

    // 3. Ensure users table has refusal_count, is_banned, ban_reason, etc.
    const userCols = [
      "ALTER TABLE users ADD COLUMN IF NOT EXISTS refusal_count integer DEFAULT 0;",
      "ALTER TABLE users ADD COLUMN IF NOT EXISTS is_banned boolean DEFAULT false;",
      "ALTER TABLE users ADD COLUMN IF NOT EXISTS ban_reason text;",
      "ALTER TABLE users ADD COLUMN IF NOT EXISTS banned_at timestamp without time zone;",
      "ALTER TABLE users ADD COLUMN IF NOT EXISTS governorate character varying;",
      "ALTER TABLE users ADD COLUMN IF NOT EXISTS area character varying;",
      "ALTER TABLE users ADD COLUMN IF NOT EXISTS address text;"
    ];
    for (const q of userCols) {
      await pool.query(q);
    }
    console.log('✅ users table enhanced with refusal tracking & address fields.');

    // 4. Ensure customer_refusals table exists
    await pool.query(`
      CREATE TABLE IF NOT EXISTS customer_refusals (
        id SERIAL PRIMARY KEY,
        customer_id integer REFERENCES users(id) ON DELETE CASCADE,
        order_id integer REFERENCES orders(id) ON DELETE CASCADE,
        recorded_by integer REFERENCES users(id) ON DELETE SET NULL,
        reason text NOT NULL,
        notes text,
        created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ customer_refusals table verified.');

    // 5. Ensure customer_order_labels table exists
    await pool.query(`
      CREATE TABLE IF NOT EXISTS customer_order_labels (
        id SERIAL PRIMARY KEY,
        order_id integer UNIQUE REFERENCES orders(id) ON DELETE CASCADE,
        usd_total numeric(12,2) NOT NULL,
        exchange_rate numeric(10,2) DEFAULT 1520.00,
        iqd_total bigint NOT NULL,
        shipping_fee_usd numeric(10,2) DEFAULT 0.00,
        printed_count integer DEFAULT 0,
        last_printed_at timestamp without time zone,
        created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ customer_order_labels table verified.');

    // 6. Ensure activity log table exists
    await pool.query(`
      CREATE TABLE IF NOT EXISTS admin_activity_log (
        id SERIAL PRIMARY KEY,
        admin_id integer,
        action character varying(255) NOT NULL,
        entity_type character varying(100),
        entity_id text,
        details text,
        created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ admin_activity_log table verified.');

    console.log('--- ALL DATABASE TABLES PERFECTLY SYNCED ---');
  } catch (err) {
    console.error('SCHEMA_SYNC_ERROR:', err);
  } finally {
    process.exit(0);
  }
}

syncSchema();

