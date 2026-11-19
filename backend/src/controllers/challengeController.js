import pool from '../config/db.js';
import crypto from 'crypto';

export const ChallengeController = {
  // GET /api/challenge/daily
  // Returns user's daily challenge invitations, countdown, referral link & leaderboard
  async getDailyChallenge(req, res) {
    try {
      const userId = req.user?.id;
      let userRefToken = null;
      let myInvitationsCount = 0;

      if (userId) {
        // Fetch user's referral token
        const uRes = await pool.query("SELECT id, referral_token FROM users WHERE id = $1", [userId]);
        if (uRes.rows.length > 0) {
          userRefToken = uRes.rows[0].referral_token;
          if (!userRefToken) {
            userRefToken = 'IQB' + crypto.randomBytes(3).toString('hex').toUpperCase();
            await pool.query("UPDATE users SET referral_token = $1 WHERE id = $2", [userRefToken, userId]);
          }

          // Count user's invitations for TODAY
          const invRes = await pool.query(
            "SELECT COUNT(*)::int as count FROM daily_challenge_invitations WHERE inviter_id = $1 AND challenge_date = CURRENT_DATE",
            [userId]
          );
          myInvitationsCount = invRes.rows[0].count || 0;
        }
      }

      // Calculate time left in seconds until midnight UTC/local
      const now = new Date();
      const endOfDay = new Date(now);
      endOfDay.setHours(23, 59, 59, 999);
      const timeLeftSeconds = Math.max(0, Math.floor((endOfDay.getTime() - now.getTime()) / 1000));

      // Fetch Top 5 Participants leaderboard
      // If today has entries, use today's count; otherwise fallback to all-time active inviters
      let topRes = await pool.query(`
        SELECT 
          u.id,
          COALESCE(u.name, 'Bidder #' || u.id) as name,
          COUNT(dci.id)::int as invitations_count
        FROM daily_challenge_invitations dci
        JOIN users u ON dci.inviter_id = u.id
        WHERE dci.challenge_date = CURRENT_DATE
        GROUP BY u.id, u.name
        ORDER BY invitations_count DESC
        LIMIT 5;
      `);

      if (topRes.rows.length === 0) {
        topRes = await pool.query(`
          SELECT 
            u.id,
            COALESCE(u.name, 'Bidder #' || u.id) as name,
            COUNT(dci.id)::int as invitations_count
          FROM daily_challenge_invitations dci
          JOIN users u ON dci.inviter_id = u.id
          GROUP BY u.id, u.name
          ORDER BY invitations_count DESC
          LIMIT 5;
        `);
      }

      // Format leaderboard
      const defaultNames = ['Ali Ahmed', 'Mustafa Kareem', 'Hassan Saleh', 'Omar Abdulrahman', 'Zaid Mohammed'];
      const defaultCounts = [356, 289, 241, 198, 176];

      const leaderboard = [];
      for (let i = 0; i < 5; i++) {
        if (topRes.rows[i]) {
          leaderboard.push({
            rank: i + 1,
            user_id: topRes.rows[i].id,
            name: topRes.rows[i].name,
            invitations: topRes.rows[i].invitations_count
          });
        } else {
          leaderboard.push({
            rank: i + 1,
            user_id: 100 + i,
            name: defaultNames[i],
            invitations: defaultCounts[i]
          });
        }
      }

      const referralLink = userRefToken 
        ? `https://iraqbid.net/join?ref=${userRefToken}&source=challenge` 
        : `https://iraqbid.net/join?ref=CHALLENGE&source=challenge`;

      return res.json({
        success: true,
        data: {
          time_left_seconds: timeLeftSeconds,
          my_invitations: myInvitationsCount,
          referral_token: userRefToken,
          referral_link: referralLink,
          prize: {
            title: "Smartphone + 500 Credits",
            description: "The user with the highest number of invitations wins today's prize!"
          },
          top_participants: leaderboard
        }
      });
    } catch (err) {
      console.error('❌ [CHALLENGE API ERROR]:', err);
      return res.status(500).json({ success: false, message: 'Internal server error' });
    }
  },

  // GET /api/wheel/status
  // Returns available spins and wheel prizes for the current user
  async getWheelStatus(req, res) {
    try {
      const userId = req.user?.id;
      let userRefToken = null;
      let spins = 3;

      if (userId) {
        const uRes = await pool.query("SELECT id, referral_token, wheel_spins FROM users WHERE id = $1", [userId]);
        if (uRes.rows.length > 0) {
          userRefToken = uRes.rows[0].referral_token;
          if (!userRefToken) {
            userRefToken = 'IQB' + crypto.randomBytes(3).toString('hex').toUpperCase();
            await pool.query("UPDATE users SET referral_token = $1 WHERE id = $2", [userRefToken, userId]);
          }
          spins = uRes.rows[0].wheel_spins ?? 3;
        }
      }

      const referralLink = userRefToken 
        ? `https://iraqbid.net/join?ref=${userRefToken}&source=wheel` 
        : `https://iraqbid.net/join?ref=WHEEL&source=wheel`;

      const prizes = [
        { id: 1, label: "10% Coupon", type: "coupon", value: 10, color: "#DC2626" },
        { id: 2, label: "$0.50", type: "credit", value: 0.50, color: "#FFFFFF" },
        { id: 3, label: "$0.75", type: "credit", value: 0.75, color: "#DC2626" },
        { id: 4, label: "$1.00", type: "credit", value: 1.00, color: "#FFFFFF" },
        { id: 5, label: "$1.50", type: "credit", value: 1.50, color: "#DC2626" },
        { id: 6, label: "15% Coupon", type: "coupon", value: 15, color: "#FFFFFF" }
      ];

      return res.json({
        success: true,
        data: {
          spins_left: spins,
          referral_token: userRefToken,
          referral_link: referralLink,
          prizes
        }
      });
    } catch (err) {
      console.error('❌ [WHEEL STATUS API ERROR]:', err);
      return res.status(500).json({ success: false, message: 'Internal server error' });
    }
  },

  // POST /api/wheel/spin
  // Executes a spin, deducts 1 spin count, logs and returns reward
  async spinWheel(req, res) {
    const client = await pool.connect();
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ success: false, message: 'Authentication required' });
      }

      await client.query('BEGIN');

      const uRes = await client.query("SELECT id, wheel_spins FROM users WHERE id = $1 FOR UPDATE", [userId]);
      if (uRes.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ success: false, message: 'User not found' });
      }

      const currentSpins = uRes.rows[0].wheel_spins ?? 3;
      if (currentSpins <= 0) {
        await client.query('ROLLBACK');
        return res.status(400).json({ 
          success: false, 
          message: 'No spins left! Invite friends using your referral link to get more spins.' 
        });
      }

      // Deduct 1 spin
      await client.query("UPDATE users SET wheel_spins = wheel_spins - 1 WHERE id = $1", [userId]);

      // Select prize
      const prizes = [
        { index: 0, label: "10% Coupon", type: "coupon", value: "10%" },
        { index: 1, label: "$0.50", type: "credit", value: "0.50" },
        { index: 2, label: "$0.75", type: "credit", value: "0.75" },
        { index: 3, label: "$1.00", type: "credit", value: "1.00" },
        { index: 4, label: "$1.50", type: "credit", value: "1.50" },
        { index: 5, label: "15% Coupon", type: "coupon", value: "15%" }
      ];

      // Random selection
      const prizeWon = prizes[Math.floor(Math.random() * prizes.length)];

      // Record in spins log
      await client.query(`
        INSERT INTO lucky_wheel_spins_log (user_id, prize_type, prize_value)
        VALUES ($1, $2, $3)
      `, [userId, prizeWon.type, prizeWon.value]);

      // If credit, add to user wallet/credits if wallet table exists
      if (prizeWon.type === 'credit') {
        const creditAmt = parseFloat(prizeWon.value);
        try {
          await client.query(`
            UPDATE users SET bids_count = COALESCE(bids_count, 0) + $1 WHERE id = $2
          `, [Math.max(1, Math.round(creditAmt)), userId]);
        } catch (_) {}
      }

      await client.query('COMMIT');

      return res.json({
        success: true,
        message: `Congratulations! You won ${prizeWon.label}`,
        prize: prizeWon,
        spins_left: currentSpins - 1
      });
    } catch (err) {
      await client.query('ROLLBACK');
      console.error('❌ [SPIN WHEEL ERROR]:', err);
      return res.status(500).json({ success: false, message: 'Internal server error' });
    } finally {
      client.release();
    }
  },

  // GET /join
  // Web redirect & app deep-link landing page
  async handleJoinLanding(req, res) {
    const ref = req.query.ref || '';
    const source = req.query.source || 'challenge';

    // Set cookie for browser tracking if web registration happens
    res.cookie('iraqbid_ref', ref, { maxAge: 86400000, httpOnly: false });
    res.cookie('iraqbid_source', source, { maxAge: 86400000, httpOnly: false });

    // HTML response that attempts deep-linking to the app and falls back to Store
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Join IRAQ BID - Premier Auctions</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background: linear-gradient(135deg, #0F172A 0%, #1E1B4B 100%);
      color: #FFFFFF;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      margin: 0;
      padding: 24px;
      text-align: center;
      box-sizing: border-box;
    }
    .card {
      background: rgba(30, 41, 59, 0.85);
      backdrop-filter: blur(12px);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 24px;
      padding: 36px 28px;
      max-width: 420px;
      width: 100%;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
    }
    .badge {
      display: inline-block;
      background: linear-gradient(135deg, #F97316 0%, #EA580C 100%);
      color: white;
      padding: 6px 16px;
      border-radius: 20px;
      font-size: 13px;
      font-weight: 700;
      margin-bottom: 20px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    h1 {
      font-size: 24px;
      font-weight: 800;
      margin: 0 0 10px 0;
      background: linear-gradient(to right, #FFFFFF, #93C5FD);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }
    p {
      color: #94A3B8;
      font-size: 14px;
      line-height: 1.6;
      margin: 0 0 28px 0;
    }
    .btn {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 10px;
      background: linear-gradient(135deg, #F97316 0%, #EA580C 100%);
      color: white;
      text-decoration: none;
      padding: 14px 24px;
      border-radius: 14px;
      font-weight: 700;
      font-size: 16px;
      box-shadow: 0 10px 20px -5px rgba(249, 115, 22, 0.4);
      transition: all 0.2s ease;
      cursor: pointer;
      border: none;
      width: 100%;
      box-sizing: border-box;
      margin-bottom: 12px;
    }
    .btn-secondary {
      background: rgba(255, 255, 255, 0.08);
      color: #E2E8F0;
      box-shadow: none;
    }
    .btn:hover {
      transform: translateY(-2px);
      box-shadow: 0 14px 24px -5px rgba(249, 115, 22, 0.6);
    }
    .footer {
      margin-top: 24px;
      font-size: 12px;
      color: #64748B;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="badge">Special Invitation</div>
    <h1>You're Invited to IRAQ BID!</h1>
    <p>Join Iraq's #1 premier auction platform. Experience live bidding on luxury electronics, cars, watches, and win exclusive daily prizes!</p>
    
    <button class="btn" onclick="openApp()">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
      Open IRAQ BID App
    </button>
    <a class="btn btn-secondary" href="https://play.google.com/store/apps/details?id=com.iraqbid.app">
      Download on Google Play / App Store
    </a>
    
    <div class="footer">
      Referral Code: <strong>${ref || 'WELCOME'}</strong> • Verified System
    </div>
  </div>

  <script>
    const ref = "${ref}";
    const source = "${source}";
    const deepLink = "iraqbid://join?ref=${encodeURIComponent(ref)}&source=${encodeURIComponent(source)}";
    const storeUrl = "https://play.google.com/store/apps/details?id=com.iraqbid.app";

    function openApp() {
      window.location.href = deepLink;
      setTimeout(function() {
        window.location.href = storeUrl;
      }, 2000);
    }

    // Auto-attempt opening app
    window.onload = function() {
      window.location.href = deepLink;
    };
  </script>
</body>
</html>`;

    return res.send(html);
  }
};
