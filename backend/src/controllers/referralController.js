import crypto from "crypto";
import pool from "../config/db.js";
import { generateReferralCode } from "../utils/referralUtils.js";
import { notifyUser } from "../utils/notificationUtils.js";

const REFERRAL_DOMAIN = process.env.REFERRAL_DOMAIN || "https://link.iraqbid.net";

async function ensureUserReferralCode(userId, userName = "") {
  const existing = await pool.query(
    "SELECT referral_code, is_active FROM referral_codes WHERE user_id = $1",
    [userId]
  );
  if (existing.rows.length > 0) {
    return existing.rows[0];
  }

  // Generate a clean unique code (e.g. AHMED25 or IQBXXXXXX)
  let code = await generateReferralCode();
  if (userName && userName.trim().length >= 3) {
    const cleanPrefix = userName.replace(/[^a-zA-Z0-9]/g, "").toUpperCase().slice(0, 6);
    if (cleanPrefix.length >= 3) {
      const candidate = `${cleanPrefix}${Math.floor(10 + Math.random() * 89)}`;
      const dup = await pool.query("SELECT id FROM referral_codes WHERE referral_code = $1", [candidate]);
      if (dup.rows.length === 0) code = candidate;
    }
  }

  const inserted = await pool.query(
    `INSERT INTO referral_codes (user_id, referral_code, is_active)
     VALUES ($1, $2, TRUE)
     ON CONFLICT (user_id) DO UPDATE SET user_id = EXCLUDED.user_id
     RETURNING referral_code, is_active`,
    [userId, code]
  );

  // Sync to users.referral_code for backward compatibility
  await pool.query("UPDATE users SET referral_code = $1 WHERE id = $2", [inserted.rows[0].referral_code, userId]).catch(() => {});
  return inserted.rows[0];
}

export const ReferralController = {
  // POST /api/referral/create & GET /api/referral/my-code
  async createOrGetReferralCode(req, res) {
    try {
      const userId = req.user.id;
      const userRes = await pool.query("SELECT id, name, reward_balance FROM users WHERE id = $1", [userId]);
      if (userRes.rows.length === 0) {
        return res.status(404).json({ success: false, message: "User not found" });
      }
      const user = userRes.rows[0];
      const codeRow = await ensureUserReferralCode(userId, user.name);

      res.json({
        success: true,
        data: {
          referral_code: codeRow.referral_code,
          referral_link: `${REFERRAL_DOMAIN}/invite/${codeRow.referral_code}`,
          is_active: codeRow.is_active,
          reward_balance: parseFloat(user.reward_balance) || 0,
        },
      });
    } catch (error) {
      console.error("Error creating/fetching referral code:", error);
      res.status(500).json({ success: false, message: "Failed to generate referral code" });
    }
  },

  // Alias for legacy GET /api/referral/my-code
  async getMyReferralCode(req, res) {
    return ReferralController.createOrGetReferralCode(req, res);
  },

  // GET /api/referral/:code (public validation)
  async validateReferralCode(req, res) {
    try {
      const code = (req.params.code || "").trim().toUpperCase();
      if (!code) {
        return res.status(400).json({ success: false, message: "Referral code is required" });
      }

      const result = await pool.query(
        `SELECT rc.referral_code, rc.is_active, u.id as inviter_id, u.name as inviter_name
         FROM referral_codes rc
         JOIN users u ON rc.user_id = u.id
         WHERE UPPER(rc.referral_code) = $1`,
        [code]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ success: false, message: "Invalid referral code" });
      }

      const row = result.rows[0];
      if (!row.is_active) {
        return res.status(400).json({ success: false, message: "This referral code is currently inactive" });
      }

      res.json({
        success: true,
        data: {
          referral_code: row.referral_code,
          inviter_name: row.inviter_name,
          is_active: row.is_active,
        },
      });
    } catch (error) {
      console.error("Error validating referral code:", error);
      res.status(500).json({ success: false, message: "Failed to validate referral code" });
    }
  },

  // POST /api/referral/click (public)
  async recordClick(req, res) {
    try {
      const { referral_code, platform = "Web" } = req.body;
      const code = (referral_code || "").trim().toUpperCase();
      if (!code) {
        return res.status(400).json({ success: false, message: "referral_code is required" });
      }

      const codeRes = await pool.query(
        "SELECT user_id, is_active FROM referral_codes WHERE UPPER(referral_code) = $1",
        [code]
      );
      if (codeRes.rows.length === 0 || !codeRes.rows[0].is_active) {
        return res.status(404).json({ success: false, message: "Invalid or inactive referral code" });
      }

      const clickId = `clk_${crypto.randomBytes(12).toString("hex")}`;
      const ip = req.headers["x-forwarded-for"]?.split(",")[0]?.trim() || req.socket?.remoteAddress || null;
      const ua = req.headers["user-agent"] || null;
      const normalizedPlatform = ["ios", "android", "web"].includes(String(platform).toLowerCase())
        ? String(platform).toLowerCase() === "ios"
          ? "iOS"
          : String(platform).toLowerCase() === "android"
          ? "Android"
          : "Web"
        : "Web";

      await pool.query(
        `INSERT INTO referral_tracking (referral_code, inviter_user_id, click_id, platform, ip_address, user_agent, status)
         VALUES ($1, $2, $3, $4, $5, $6, 'Pending')`,
        [code, codeRes.rows[0].user_id, clickId, normalizedPlatform, ip, ua]
      );

      res.status(201).json({
        success: true,
        data: { click_id: clickId, referral_code: code, platform: normalizedPlatform },
      });
    } catch (error) {
      console.error("Error recording referral click:", error);
      res.status(500).json({ success: false, message: "Failed to record click" });
    }
  },

  // POST /api/referral/claim (authenticated new user after phone verification)
  async claimReferral(req, res) {
    const client = await pool.connect();
    try {
      const invitedUserId = req.user.id;
      const { referral_code, click_id, platform = "Web" } = req.body;
      const code = (referral_code || "").trim().toUpperCase();

      if (!code) {
        return res.status(400).json({ success: false, message: "referral_code is required" });
      }

      await client.query("BEGIN");

      // 1. Check referral settings
      const settingsRes = await client.query("SELECT * FROM referral_settings WHERE id = 1");
      const settings = settingsRes.rows[0] || {
        is_enabled: true,
        reward_amount: 5.0,
        reward_currency: "USD",
        max_rewards_per_user: 50,
        manual_approval_required: false,
      };

      if (!settings.is_enabled) {
        await client.query("ROLLBACK");
        return res.status(400).json({ success: false, message: "Referral system is currently disabled" });
      }

      // 2. Validate referral code & inviter
      const codeRes = await client.query(
        "SELECT user_id, is_active FROM referral_codes WHERE UPPER(referral_code) = $1",
        [code]
      );
      if (codeRes.rows.length === 0 || !codeRes.rows[0].is_active) {
        await client.query("ROLLBACK");
        return res.status(404).json({ success: false, message: "Invalid or inactive referral code" });
      }

      const inviterUserId = codeRes.rows[0].user_id;

      // 3. Fraud check: cannot invite self
      if (Number(inviterUserId) === Number(invitedUserId)) {
        await client.query("ROLLBACK");
        return res.status(400).json({ success: false, message: "You cannot use your own referral code" });
      }

      // 4. Fraud check: prevent duplicate claim for same invited user
      const existingReward = await client.query(
        "SELECT id FROM referral_rewards WHERE invited_user_id = $1",
        [invitedUserId]
      );
      if (existingReward.rows.length > 0) {
        await client.query("ROLLBACK");
        return res.status(400).json({ success: false, message: "Referral already claimed for this account" });
      }

      // 5. Check max rewards limit for inviter
      const inviterCountRes = await client.query(
        "SELECT COUNT(*) as cnt FROM referral_rewards WHERE inviter_user_id = $1 AND status IN ('Approved', 'Paid')",
        [inviterUserId]
      );
      if (parseInt(inviterCountRes.rows[0].cnt, 10) >= (settings.max_rewards_per_user || 50)) {
        await client.query("ROLLBACK");
        return res.status(400).json({ success: false, message: "Inviter has reached maximum referral rewards limit" });
      }

      // 6. Update or insert referral_tracking
      if (click_id) {
        const upd = await client.query(
          `UPDATE referral_tracking
           SET invited_user_id = $1, registered_at = NOW(), status = 'Completed'
           WHERE click_id = $2 AND invited_user_id IS NULL
           RETURNING id`,
          [invitedUserId, click_id]
        );
        if (upd.rows.length === 0) {
          await client.query(
            `INSERT INTO referral_tracking (referral_code, inviter_user_id, invited_user_id, click_id, platform, registered_at, status)
             VALUES ($1, $2, $3, $4, $5, NOW(), 'Completed')
             ON CONFLICT (click_id) DO NOTHING`,
            [code, inviterUserId, invitedUserId, `clk_${crypto.randomBytes(10).toString("hex")}`, platform]
          );
        }
      } else {
        await client.query(
          `INSERT INTO referral_tracking (referral_code, inviter_user_id, invited_user_id, click_id, platform, registered_at, status)
           VALUES ($1, $2, $3, $4, $5, NOW(), 'Completed')`,
          [code, inviterUserId, invitedUserId, `clk_${crypto.randomBytes(10).toString("hex")}`, platform]
        );
      }

      // 7. Insert referral_rewards (UNIQUE constraint on invited_user_id guarantees no duplicates)
      const rewardAmount = parseFloat(settings.reward_amount) || 5.0;
      const rewardStatus = settings.manual_approval_required ? "Pending" : "Paid";

      await client.query(
        `INSERT INTO referral_rewards (inviter_user_id, invited_user_id, amount, currency, status)
         VALUES ($1, $2, $3, $4, $5)`,
        [inviterUserId, invitedUserId, rewardAmount, settings.reward_currency || "USD", rewardStatus]
      );

      // 8. Credit inviter wallet if auto-approved
      if (rewardStatus === "Paid") {
        await client.query(
          "UPDATE users SET reward_balance = COALESCE(reward_balance, 0) + $1, wallet_balance = COALESCE(wallet_balance, 0) + $1 WHERE id = $2",
          [rewardAmount, inviterUserId]
        );
      }

      await client.query("COMMIT");

      // 9. Notify inviter
      notifyUser(
        inviterUserId,
        "Referral Reward!",
        rewardStatus === "Paid"
          ? `Your friend joined IRAQ BID using your link! $${rewardAmount} has been credited to your wallet.`
          : `Your friend joined IRAQ BID using your link! Your $${rewardAmount} reward is pending approval.`,
        "referral",
        invitedUserId
      ).catch(() => {});

      res.status(201).json({
        success: true,
        message: "Referral claimed successfully",
        data: {
          inviter_user_id: inviterUserId,
          reward_amount: rewardAmount,
          status: rewardStatus,
        },
      });
    } catch (error) {
      await client.query("ROLLBACK");
      console.error("Error claiming referral:", error);
      res.status(500).json({ success: false, message: "Failed to claim referral" });
    } finally {
      client.release();
    }
  },

  // GET /api/referral/stats
  async getReferralStats(req, res) {
    try {
      const userId = req.user.id;
      const codeRow = await ensureUserReferralCode(userId, req.user.name);

      const clicksRes = await pool.query(
        "SELECT COUNT(*) as total_clicks, COUNT(invited_user_id) as total_registered FROM referral_tracking WHERE inviter_user_id = $1",
        [userId]
      );
      const rewardsRes = await pool.query(
        `SELECT 
           COUNT(*) FILTER (WHERE status IN ('Approved', 'Paid')) as successful_referrals,
           COUNT(*) FILTER (WHERE status = 'Pending') as pending_referrals,
           COALESCE(SUM(amount) FILTER (WHERE status IN ('Approved', 'Paid')), 0) as total_earned
         FROM referral_rewards WHERE inviter_user_id = $1`,
        [userId]
      );

      res.json({
        success: true,
        data: {
          referral_code: codeRow.referral_code,
          referral_link: `${REFERRAL_DOMAIN}/invite/${codeRow.referral_code}`,
          total_clicks: parseInt(clicksRes.rows[0].total_clicks, 10) || 0,
          total_registered: parseInt(clicksRes.rows[0].total_registered, 10) || 0,
          successful_referrals: parseInt(rewardsRes.rows[0].successful_referrals, 10) || 0,
          pending_referrals: parseInt(rewardsRes.rows[0].pending_referrals, 10) || 0,
          total_earned: parseFloat(rewardsRes.rows[0].total_earned) || 0,
        },
      });
    } catch (error) {
      console.error("Error fetching referral stats:", error);
      res.status(500).json({ success: false, message: "Failed to fetch referral stats" });
    }
  },

  // GET /api/referral/history
  async getReferralHistory(req, res) {
    try {
      const userId = req.user.id;
      const { page = 1, limit = 20 } = req.query;
      const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);

      const result = await pool.query(
        `SELECT 
           rr.id,
           rr.amount,
           rr.currency,
           rr.status,
           rr.created_at,
           u.name as invitee_name,
           u.phone as invitee_phone
         FROM referral_rewards rr
         LEFT JOIN users u ON rr.invited_user_id = u.id
         WHERE rr.inviter_user_id = $1
         ORDER BY rr.created_at DESC
         LIMIT $2 OFFSET $3`,
        [userId, parseInt(limit, 10), offset]
      );

      const countResult = await pool.query(
        "SELECT COUNT(*) as total FROM referral_rewards WHERE inviter_user_id = $1",
        [userId]
      );

      res.json({
        success: true,
        data: result.rows,
        pagination: {
          total: parseInt(countResult.rows[0].total, 10),
          page: parseInt(page, 10),
          limit: parseInt(limit, 10),
          pages: Math.ceil(parseInt(countResult.rows[0].total, 10) / parseInt(limit, 10)),
        },
      });
    } catch (error) {
      console.error("Error fetching referral history:", error);
      res.status(500).json({ success: false, message: "Failed to fetch referral history" });
    }
  },
};
