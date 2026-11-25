import crypto from "crypto";
import pool from "../config/db.js";

const BASE32_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

function generateBase32Secret(length = 20) {
  const bytes = crypto.randomBytes(length);
  let secret = "";
  for (let i = 0; i < bytes.length; i++) {
    secret += BASE32_CHARS[bytes[i] % 32];
  }
  return secret;
}

function base32ToBuffer(base32) {
  const clean = base32.toUpperCase().replace(/=+$/, "");
  let bits = "";
  for (const char of clean) {
    const val = BASE32_CHARS.indexOf(char);
    if (val === -1) continue;
    bits += val.toString(2).padStart(5, "0");
  }
  const bytes = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) {
    bytes.push(parseInt(bits.slice(i, i + 8), 2));
  }
  return Buffer.from(bytes);
}

export function verifyTOTP(secret, token, window = 1) {
  if (!secret || !token) return false;
  const cleanToken = String(token).trim();
  if (!/^\d{6}$/.test(cleanToken)) return false;

  const key = base32ToBuffer(secret);
  const epoch = Math.floor(Date.now() / 1000 / 30);

  for (let offset = -window; offset <= window; offset++) {
    const counter = epoch + offset;
    const buf = Buffer.alloc(8);
    buf.writeBigUInt64BE(BigInt(counter));
    const hmac = crypto.createHmac("sha1", key).update(buf).digest();
    const pos = hmac[hmac.length - 1] & 0x0f;
    const code =
      ((hmac[pos] & 0x7f) << 24) |
      ((hmac[pos + 1] & 0xff) << 16) |
      ((hmac[pos + 2] & 0xff) << 8) |
      (hmac[pos + 3] & 0xff);
    const otp = String(code % 1000000).padStart(6, "0");
    if (otp === cleanToken) return true;
  }
  return false;
}

export async function logAdminAudit(adminId, action, details = {}, req = null) {
  try {
    const ip = req?.headers?.["x-forwarded-for"]?.split(",")[0]?.trim() || req?.socket?.remoteAddress || null;
    await pool.query(
      "INSERT INTO admin_audit_logs (admin_id, action, details, ip_address) VALUES ($1, $2, $3, $4)",
      [adminId || null, action, JSON.stringify(details), ip]
    );
  } catch (err) {
    console.warn("⚠️ [AdminAudit] Failed to log:", err.message);
  }
}

export const AdminSecurityController = {
  // POST /api/admin/2fa/setup
  async setup2FA(req, res) {
    try {
      const adminId = req.user.id;
      const secret = generateBase32Secret(20);
      await pool.query(
        "UPDATE admins SET two_factor_secret = $1 WHERE id = $2",
        [secret, adminId]
      );
      const email = req.user.email || `admin_${adminId}@iraqbid.net`;
      const otpauthUrl = `otpauth://totp/IraqBidAdmin:${encodeURIComponent(email)}?secret=${secret}&issuer=IraqBidAdmin`;

      await logAdminAudit(adminId, "2FA_SETUP_INITIATED", {}, req);
      res.json({
        success: true,
        data: { secret, otpauth_url: otpauthUrl },
      });
    } catch (error) {
      console.error("2FA setup error:", error);
      res.status(500).json({ success: false, message: "Failed to setup 2FA" });
    }
  },

  // POST /api/admin/2fa/verify
  async verify2FA(req, res) {
    try {
      const adminId = req.user.id;
      const { token } = req.body;
      const result = await pool.query("SELECT two_factor_secret FROM admins WHERE id = $1", [adminId]);
      if (result.rows.length === 0 || !result.rows[0].two_factor_secret) {
        return res.status(400).json({ success: false, message: "2FA not initialized. Call /2fa/setup first." });
      }

      const valid = verifyTOTP(result.rows[0].two_factor_secret, token);
      if (!valid) {
        await logAdminAudit(adminId, "2FA_VERIFY_FAILED", {}, req);
        return res.status(400).json({ success: false, message: "Invalid 6-digit 2FA code" });
      }

      await pool.query("UPDATE admins SET two_factor_enabled = TRUE WHERE id = $1", [adminId]);
      await logAdminAudit(adminId, "2FA_ENABLED", {}, req);
      res.json({ success: true, message: "Two-Factor Authentication enabled successfully" });
    } catch (error) {
      console.error("2FA verify error:", error);
      res.status(500).json({ success: false, message: "Failed to verify 2FA" });
    }
  },

  // POST /api/admin/2fa/disable
  async disable2FA(req, res) {
    try {
      const adminId = req.user.id;
      const { token } = req.body;
      const result = await pool.query("SELECT two_factor_secret, two_factor_enabled FROM admins WHERE id = $1", [adminId]);
      if (result.rows.length === 0) {
        return res.status(404).json({ success: false, message: "Admin not found" });
      }

      if (result.rows[0].two_factor_enabled && !verifyTOTP(result.rows[0].two_factor_secret, token)) {
        return res.status(400).json({ success: false, message: "Valid 2FA code required to disable 2FA" });
      }

      await pool.query("UPDATE admins SET two_factor_enabled = FALSE, two_factor_secret = NULL WHERE id = $1", [adminId]);
      await logAdminAudit(adminId, "2FA_DISABLED", {}, req);
      res.json({ success: true, message: "Two-Factor Authentication disabled" });
    } catch (error) {
      console.error("2FA disable error:", error);
      res.status(500).json({ success: false, message: "Failed to disable 2FA" });
    }
  },

  // POST /api/admin/referral/reward
  async manageReferralReward(req, res) {
    const client = await pool.connect();
    try {
      const adminId = req.user.id;
      const { reward_id, action, reason = "" } = req.body; // action: 'approve' | 'pay' | 'reverse'
      if (!reward_id || !["approve", "pay", "reverse"].includes(action)) {
        return res.status(400).json({ success: false, message: "reward_id and valid action (approve|pay|reverse) required" });
      }

      await client.query("BEGIN");

      const rewardRes = await client.query("SELECT * FROM referral_rewards WHERE id = $1 FOR UPDATE", [reward_id]);
      if (rewardRes.rows.length === 0) {
        await client.query("ROLLBACK");
        return res.status(404).json({ success: false, message: "Referral reward not found" });
      }

      const reward = rewardRes.rows[0];
      const amount = parseFloat(reward.amount) || 0;
      let newStatus = reward.status;

      if (action === "approve" && reward.status === "Pending") {
        newStatus = "Approved";
      } else if (action === "pay" && (reward.status === "Pending" || reward.status === "Approved")) {
        newStatus = "Paid";
        await client.query(
          "UPDATE users SET reward_balance = COALESCE(reward_balance, 0) + $1, wallet_balance = COALESCE(wallet_balance, 0) + $1 WHERE id = $2",
          [amount, reward.inviter_user_id]
        );
      } else if (action === "reverse" && reward.status !== "Reversed") {
        if (reward.status === "Paid") {
          await client.query(
            "UPDATE users SET reward_balance = GREATEST(0, COALESCE(reward_balance, 0) - $1), wallet_balance = GREATEST(0, COALESCE(wallet_balance, 0) - $1) WHERE id = $2",
            [amount, reward.inviter_user_id]
          );
        }
        newStatus = "Reversed";
      } else {
        await client.query("ROLLBACK");
        return res.status(400).json({ success: false, message: `Cannot ${action} reward in status ${reward.status}` });
      }

      await client.query("UPDATE referral_rewards SET status = $1 WHERE id = $2", [newStatus, reward_id]);
      await client.query("COMMIT");

      await logAdminAudit(adminId, `REFERRAL_REWARD_${action.toUpperCase()}`, { reward_id, previous_status: reward.status, new_status: newStatus, amount, reason }, req);

      res.json({
        success: true,
        message: `Referral reward ${newStatus.toLowerCase()} successfully`,
        data: { reward_id, status: newStatus, amount },
      });
    } catch (error) {
      await client.query("ROLLBACK");
      console.error("Admin referral reward error:", error);
      res.status(500).json({ success: false, message: "Failed to process referral reward" });
    } finally {
      client.release();
    }
  },
};
