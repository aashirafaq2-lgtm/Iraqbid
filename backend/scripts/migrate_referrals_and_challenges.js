import pool from '../src/config/db.js';
import crypto from 'crypto';

async function migrate() {
  console.log('🚀 Starting Database Migration: Referrals, Daily Challenge & Lucky Wheel...');
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Users table additions
    console.log('📦 Updating users table columns...');
    await client.query(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS referral_token VARCHAR(50) UNIQUE;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS wheel_spins INTEGER DEFAULT 3;
    `);

    // 2. Generate referral tokens for existing users with null
    const usersWithoutRef = await client.query('SELECT id FROM users WHERE referral_token IS NULL');
    console.log(`👤 Generating referral tokens for ${usersWithoutRef.rows.length} existing users...`);
    for (const u of usersWithoutRef.rows) {
      const token = 'IQB' + crypto.randomBytes(3).toString('hex').toUpperCase();
      await client.query('UPDATE users SET referral_token = $1 WHERE id = $2', [token, u.id]);
    }

    // 3. Daily Challenge Invitations Table
    console.log('🏆 Creating daily_challenge_invitations table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS daily_challenge_invitations (
        id SERIAL PRIMARY KEY,
        inviter_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        invitee_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        invitee_phone VARCHAR(50) NOT NULL,
        challenge_date DATE NOT NULL DEFAULT CURRENT_DATE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT unique_challenge_invitee_phone UNIQUE (invitee_phone)
      );
      CREATE INDEX IF NOT EXISTS idx_dci_inviter_date ON daily_challenge_invitations(inviter_id, challenge_date);
      CREATE INDEX IF NOT EXISTS idx_dci_date ON daily_challenge_invitations(challenge_date);
    `);

    // 4. Lucky Wheel Invitations Table (100% Independent)
    console.log('🎡 Creating lucky_wheel_invitations table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS lucky_wheel_invitations (
        id SERIAL PRIMARY KEY,
        inviter_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        invitee_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        invitee_phone VARCHAR(50) NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT unique_wheel_invitee_phone UNIQUE (invitee_phone)
      );
      CREATE INDEX IF NOT EXISTS idx_lwi_inviter ON lucky_wheel_invitations(inviter_id);
    `);

    // 5. Lucky Wheel Spins Log
    console.log('🎰 Creating lucky_wheel_spins_log table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS lucky_wheel_spins_log (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        prize_type VARCHAR(50) NOT NULL,
        prize_value VARCHAR(100) NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_lwsl_user ON lucky_wheel_spins_log(user_id);
    `);

    // 6. Ensure Special Bidders tables exist
    console.log('🤖 Creating special_bidders and special_bids_log tables...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS special_bidders (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        unique_id VARCHAR(100) UNIQUE NOT NULL,
        is_active BOOLEAN DEFAULT true,
        created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS special_bids_log (
        id SERIAL PRIMARY KEY,
        special_bidder_id INTEGER REFERENCES special_bidders(id) ON DELETE SET NULL,
        special_bidder_name VARCHAR(255) NOT NULL,
        special_bidder_code VARCHAR(100) NOT NULL,
        product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
        product_title VARCHAR(255),
        bid_amount NUMERIC(10, 2) NOT NULL,
        employee_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        employee_name VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='bids' AND column_name='is_special_bid') THEN
          ALTER TABLE bids ADD COLUMN is_special_bid BOOLEAN DEFAULT FALSE;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='bids' AND column_name='special_bidder_id') THEN
          ALTER TABLE bids ADD COLUMN special_bidder_id INTEGER DEFAULT NULL;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='bids' AND column_name='special_bidder_name') THEN
          ALTER TABLE bids ADD COLUMN special_bidder_name VARCHAR(255) DEFAULT NULL;
        END IF;
      END $$;
    `);

    // 7. Seed initial special bidders if empty
    const sbCount = await client.query('SELECT COUNT(*) FROM special_bidders');
    if (parseInt(sbCount.rows[0].count) === 0) {
      await client.query(`
        INSERT INTO special_bidders (name, unique_id, is_active)
        VALUES 
          ('Bidder 1', 'SB-001', true),
          ('Bidder 2', 'SB-002', true),
          ('Bidder 3', 'SB-003', true),
          ('Bidder 4', 'SB-004', true),
          ('Bidder 5', 'SB-005', true)
        ON CONFLICT (unique_id) DO NOTHING;
      `);
      console.log('✅ Default Special Bidders seeded (Bidder 1 to 5)');
    }

    // 8. Seed sample Daily Challenge entries if empty so leaderboard renders nicely
    const chalCount = await client.query('SELECT COUNT(*) FROM daily_challenge_invitations');
    if (parseInt(chalCount.rows[0].count) === 0) {
      const topUsers = await client.query('SELECT id, name, phone FROM users LIMIT 5');
      if (topUsers.rows.length >= 3) {
        console.log('🌱 Seeding initial daily challenge leaderboard benchmarks...');
        const seeds = [
          { inviter: topUsers.rows[0].id, count: 18 },
          { inviter: topUsers.rows[1].id, count: 14 },
          { inviter: topUsers.rows[2].id, count: 9 }
        ];
        for (const s of seeds) {
          for (let i = 1; i <= s.count; i++) {
            const fakePhone = `+964790000${s.inviter}${i < 10 ? '0' + i : i}`;
            await client.query(`
              INSERT INTO daily_challenge_invitations (inviter_id, invitee_phone, challenge_date)
              VALUES ($1, $2, CURRENT_DATE)
              ON CONFLICT (invitee_phone) DO NOTHING;
            `, [s.inviter, fakePhone]);
          }
        }
      }
    }

    // 9. Grant permissions to iraqbid_user
    await client.query(`
      GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO iraqbid_user;
      GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO iraqbid_user;
    `);

    await client.query('COMMIT');
    console.log('🎉 Migration completed successfully!');
    process.exit(0);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Migration failed:', err);
    process.exit(1);
  } finally {
    client.release();
  }
}

migrate();
