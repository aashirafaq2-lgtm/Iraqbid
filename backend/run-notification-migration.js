
import pool from './src/config/db.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function runMigration() {
  console.log('🚀 Running Database Migrations...\n');

  try {
    const client = await pool.connect();
    try {
      console.log('📜 Applying Migration 013 (Notifications & Referrer ID)...');
      const sql013 = fs.readFileSync(path.join(__dirname, 'migrations', '013_add_notifications_and_referrer_id.sql'), 'utf8');
      await client.query(sql013);
      console.log('✅ Migration 013 applied.');

      console.log('📜 Applying Migration 014 (Auction Processed Flag)...');
      const sql014 = fs.readFileSync(path.join(__dirname, 'migrations', '014_add_auction_processed.sql'), 'utf8');
      await client.query(sql014);
      console.log('✅ Migration 014 applied.');

      console.log('\n✨ All migrations applied successfully!');
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }

  process.exit(0);
}

runMigration();
