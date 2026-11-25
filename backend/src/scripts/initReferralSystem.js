import pool from "../config/db.js";

/**
 * Initializes all Referral, Deep-Linking, and Admin Security tables & constraints.
 * Safe to run on every server startup (uses IF NOT EXISTS).
 */
export async function initReferralSystemTables() {
  try {
    // Table A: referral_codes
    await pool.query(`
      CREATE TABLE IF NOT EXISTS referral_codes (
        id BIGSERIAL PRIMARY KEY,
        user_id BIGINT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
        referral_code VARCHAR(50) NOT NULL UNIQUE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        is_active BOOLEAN NOT NULL DEFAULT TRUE
      );
    `);

    // Table B: referral_tracking
    await pool.query(`
      CREATE TABLE IF NOT EXISTS referral_tracking (
        id BIGSERIAL PRIMARY KEY,
        referral_code VARCHAR(50) NOT NULL,
        inviter_user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        invited_user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
        click_id VARCHAR(100) NOT NULL UNIQUE,
        platform VARCHAR(20) NOT NULL DEFAULT 'Web',
        ip_address VARCHAR(64),
        user_agent TEXT,
        clicked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        registered_at TIMESTAMPTZ,
        status VARCHAR(20) NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'Completed', 'Rejected'))
      );
    `);

    // Table C: referral_rewards (UNIQUE constraint on invited_user_id prevents duplicate rewards)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS referral_rewards (
        id BIGSERIAL PRIMARY KEY,
        inviter_user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        invited_user_id BIGINT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
        amount NUMERIC(12, 2) NOT NULL DEFAULT 5.00,
        currency VARCHAR(10) NOT NULL DEFAULT 'USD',
        status VARCHAR(20) NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'Approved', 'Paid', 'Reversed')),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    // Referral Settings table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS referral_settings (
        id INTEGER PRIMARY KEY DEFAULT 1,
        is_enabled BOOLEAN NOT NULL DEFAULT TRUE,
        reward_amount NUMERIC(12, 2) NOT NULL DEFAULT 5.00,
        reward_currency VARCHAR(10) NOT NULL DEFAULT 'USD',
        require_phone_verification BOOLEAN NOT NULL DEFAULT TRUE,
        max_rewards_per_user INTEGER NOT NULL DEFAULT 50,
        expiry_days INTEGER NOT NULL DEFAULT 30,
        fraud_detection_enabled BOOLEAN NOT NULL DEFAULT TRUE,
        manual_approval_required BOOLEAN NOT NULL DEFAULT FALSE,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    await pool.query(`
      INSERT INTO referral_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;
    `);

    // Admin Audit Logs & 2FA columns
    await pool.query(`
      CREATE TABLE IF NOT EXISTS admin_audit_logs (
        id BIGSERIAL PRIMARY KEY,
        admin_id BIGINT,
        action VARCHAR(100) NOT NULL,
        details JSONB,
        ip_address VARCHAR(64),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    await pool.query(`
      ALTER TABLE admins
      ADD COLUMN IF NOT EXISTS two_factor_secret VARCHAR(128),
      ADD COLUMN IF NOT EXISTS two_factor_enabled BOOLEAN NOT NULL DEFAULT FALSE;
    `).catch(() => {});

    // Coming Soon "Notify Me" interests table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS coming_soon_interests (
        id BIGSERIAL PRIMARY KEY,
        product_id BIGINT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
        user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE(product_id, user_id)
      );
    `);

    console.log("✅ [ReferralSystem] Database tables & constraints verified.");
  } catch (err) {
    console.error("❌ [ReferralSystem] Error initializing tables:", err.message);
  }
}
