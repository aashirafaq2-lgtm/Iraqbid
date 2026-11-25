import crypto from "crypto";
import pool from "../config/db.js";

const APPLE_TEAM_ID = process.env.APPLE_TEAM_ID || "585FVS6NFQ";
const APPLE_APP_ID = process.env.APPLE_TEAM_APP_ID || `${APPLE_TEAM_ID}.com.iraqbid.app`;
const ANDROID_PACKAGE = process.env.ANDROID_PACKAGE_NAME || "com.iraqbid.app";
const ANDROID_SHA256 = process.env.ANDROID_SHA256_FINGERPRINT || "00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00";
const IOS_STORE_URL = process.env.APP_STORE_URL || process.env.IOS_STORE_URL || "https://apps.apple.com/app/id6758961797";
const ANDROID_STORE_URL = process.env.PLAY_STORE_URL || process.env.ANDROID_STORE_URL || `https://play.google.com/store/apps/details?id=${ANDROID_PACKAGE}`;

export const DeepLinkController = {
  // GET /.well-known/apple-app-site-association
  serveAppleAssociation(req, res) {
    res.setHeader("Content-Type", "application/json");
    res.setHeader("Cache-Control", "public, max-age=3600");
    return res.status(200).json({
      applinks: {
        apps: [],
        details: [
          {
            appID: APPLE_APP_ID,
            paths: ["/invite/*", "/invite", "/join*"],
          },
        ],
      },
    });
  },

  // GET /.well-known/assetlinks.json
  serveAndroidAssetLinks(req, res) {
    res.setHeader("Content-Type", "application/json");
    res.setHeader("Cache-Control", "public, max-age=3600");
    return res.status(200).json([
      {
        relation: ["delegate_permission/common.handle_all_urls"],
        target: {
          namespace: "android_app",
          package_name: ANDROID_PACKAGE,
          sha256_cert_fingerprints: [ANDROID_SHA256],
        },
      },
    ]);
  },

  // GET /invite/:code - Smart Device Detection + Deferred Attribution + Store Redirect
  async handleInviteLink(req, res) {
    const code = (req.params.code || req.query.ref || "").trim().toUpperCase();
    const ua = req.headers["user-agent"] || "";
    const ip = req.headers["x-forwarded-for"]?.split(",")[0]?.trim() || req.socket?.remoteAddress || null;

    const isIOS = /iPhone|iPad|iPod/i.test(ua);
    const isAndroid = /Android/i.test(ua);
    const platform = isIOS ? "iOS" : isAndroid ? "Android" : "Web";

    let clickId = `clk_${crypto.randomBytes(12).toString("hex")}`;

    // Record click in referral_tracking if code is valid
    if (code) {
      try {
        const codeRes = await pool.query(
          "SELECT user_id, is_active FROM referral_codes WHERE UPPER(referral_code) = $1",
          [code]
        );
        if (codeRes.rows.length > 0 && codeRes.rows[0].is_active) {
          await pool.query(
            `INSERT INTO referral_tracking (referral_code, inviter_user_id, click_id, platform, ip_address, user_agent, status)
             VALUES ($1, $2, $3, $4, $5, $6, 'Pending')`,
            [code, codeRes.rows[0].user_id, clickId, platform, ip, ua]
          );
        }
      } catch (err) {
        console.warn("⚠️ [DeepLink] Click tracking warning:", err.message);
      }
    }

    const appDeepLink = `iraqbid://invite/${encodeURIComponent(code)}?click_id=${encodeURIComponent(clickId)}`;
    const playStoreWithReferrer = `${ANDROID_STORE_URL}&referrer=${encodeURIComponent(`referral_code=${code}&click_id=${clickId}`)}`;

    // Serve smart HTML page that:
    // 1. Preserves referral_code + click_id in clipboard for iOS Deferred Deep Linking
    // 2. Attempts direct app open via custom scheme
    // 3. Redirects to official App Store / Play Store if app is not installed
    // 4. Shows clean Desktop landing page with both store buttons
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    return res.status(200).send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>IRAQ BID – Exclusive Invitation</title>
  <meta property="og:title" content="Join IRAQ BID – Live Luxury Auctions" />
  <meta property="og:description" content="You've been invited to IRAQ BID! Download the app to claim your welcome referral bonus." />
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0f172a; color: #f8fafc; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; padding: 20px; text-align: center; }
    .card { background: #1e293b; border: 1px solid #334155; border-radius: 20px; padding: 36px 28px; max-width: 420px; width: 100%; box-shadow: 0 20px 50px rgba(0,0,0,0.4); }
    h1 { font-size: 24px; margin: 0 0 8px; color: #38bdf8; }
    p { font-size: 15px; color: #cbd5e1; line-height: 1.5; margin: 0 0 24px; }
    .code-box { background: #0f172a; border: 1px dashed #38bdf8; border-radius: 12px; padding: 12px; font-size: 18px; font-weight: 800; letter-spacing: 1.5px; color: #fbbf24; margin-bottom: 24px; }
    .btn { display: block; width: 100%; padding: 14px; border-radius: 12px; font-size: 16px; font-weight: 700; text-decoration: none; margin-bottom: 12px; box-sizing: border-box; }
    .btn-ios { background: #ffffff; color: #0f172a; }
    .btn-android { background: #0284c7; color: #ffffff; }
  </style>
</head>
<body>
  <div class="card">
    <h1>IRAQ BID</h1>
    <p>You have been invited to join Iraq's #1 Live Auction Platform.</p>
    ${code ? `<div class="code-box">Invite Code: ${code}</div>` : ""}
    <a class="btn btn-ios" href="${IOS_STORE_URL}">Download on App Store</a>
    <a class="btn btn-android" href="${playStoreWithReferrer}">Get it on Google Play</a>
  </div>
  <script>
    (function() {
      var isIOS = ${isIOS ? "true" : "false"};
      var isAndroid = ${isAndroid ? "true" : "false"};
      var deepLink = "${appDeepLink}";
      var iosStore = "${IOS_STORE_URL}";
      var androidStore = "${playStoreWithReferrer}";
      var refPayload = "IRAQBID_REF:${code}:${clickId}";

      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(refPayload).catch(function(){});
      }

      if (isIOS) {
        window.location.href = deepLink;
        setTimeout(function() { window.location.href = iosStore; }, 1200);
      } else if (isAndroid) {
        window.location.href = deepLink;
        setTimeout(function() { window.location.href = androidStore; }, 1200);
      }
    })();
  </script>
</body>
</html>`);
  },
};
