import pool from "../config/db.js";

export const WalletController = {
  // GET /api/wallet
  async getWallet(req, res) {
    try {
      const userId = req.user.id;

      // 1. Get referral reward balance from users table
      const userResult = await pool.query(
        "SELECT reward_balance, is_verified FROM users WHERE id = $1",
        [userId]
      );
      const referralBalance = parseFloat(userResult.rows[0]?.reward_balance) || 0;

      // 2. Get seller earnings breakdown
      const earningsResult = await pool.query(
        `SELECT 
          COALESCE(SUM(CASE WHEN status = 'sold' THEN current_bid ELSE 0 END), 0) as completed_earnings,
          COALESCE(SUM(CASE WHEN status = 'approved' AND auction_end_time < NOW() AND highest_bidder_id IS NOT NULL THEN current_bid ELSE 0 END), 0) as pending_earnings
        FROM products 
        WHERE seller_id = $1`,
        [userId]
      );
      const sellerEarnings = parseFloat(earningsResult.rows[0].completed_earnings) || 0;
      const pendingEarnings = parseFloat(earningsResult.rows[0].pending_earnings) || 0;

      // 3. Get total withdrawals (completed)
      const withdrawalResult = await pool.query(
        "SELECT COALESCE(SUM(amount), 0) as total_withdrawn FROM withdrawals WHERE user_id = $1 AND status = 'completed'",
        [userId]
      );
      const totalWithdrawn = parseFloat(withdrawalResult.rows[0].total_withdrawn) || 0;

      // Calculate available total balance
      const totalBalance = referralBalance + sellerEarnings - totalWithdrawn;

      // 4. Get unified transactions list
      // a. Sales transactions
      const salesQuery = `
        SELECT 
          id, title as description, current_bid as amount, 'sale' as type, 'completed' as status, auction_end_time as date
        FROM products 
        WHERE seller_id = $1 AND status = 'sold'
      `;

      // b. Referral rewards
      const referralsQuery = `
        SELECT 
          id, invitee_phone as description, amount, 'reward' as type, status, created_at as date
        FROM referral_transactions 
        WHERE inviter_user_id = $1
      `;

      // c. Withdrawals
      const withdrawalsQuery = `
        SELECT 
          id, payment_method as description, amount, 'withdrawal' as type, status, created_at as date
        FROM withdrawals 
        WHERE user_id = $1
      `;

      // d. Bid placements (optional: showing money spent)
      const bidsQuery = `
        SELECT 
          b.id, p.title as description, b.amount, 'bid_placement' as type, 'completed' as status, b.created_at as date
        FROM bids b
        JOIN products p ON b.product_id = p.id
        WHERE b.user_id = $1
      `;

      const [sales, referrals, withdrawals, bids] = await Promise.all([
        pool.query(salesQuery, [userId]).then(r => r.rows),
        pool.query(referralsQuery, [userId]).then(r => r.rows).catch(() => []),
        pool.query(withdrawalsQuery, [userId]).then(r => r.rows).catch(() => []),
        pool.query(bidsQuery, [userId]).then(r => r.rows).catch(() => [])
      ]);

      const allTransactions = [...sales, ...referrals, ...withdrawals, ...bids].sort(
        (a, b) => new Date(b.date) - new Date(a.date)
      );

      res.json({
        success: true,
        data: {
          total_balance: totalBalance,
          breakdown: {
            referral_rewards: referralBalance,
            seller_earnings: sellerEarnings,
            pending_earnings: pendingEarnings,
            total_withdrawn: totalWithdrawn
          },
          transactions: allTransactions.slice(0, 50)
        }
      });
    } catch (error) {
      console.error("❌ [Wallet] Error:", error);
      res.status(500).json({ success: false, message: "Internal server error" });
    }
  },

  // POST /api/wallet/withdraw
  async requestWithdrawal(req, res) {
    try {
      const userId = req.user.id;
      const { amount, payment_method, payment_details } = req.body;

      if (!amount || amount <= 0) {
        return res.status(400).json({ success: false, message: "Invalid amount" });
      }

      // Check balance before allowing request
      const walletResult = await pool.query(
        "SELECT reward_balance FROM users WHERE id = $1",
        [userId]
      );
      const referralBalance = parseFloat(walletResult.rows[0]?.reward_balance) || 0;

      const salesResult = await pool.query(
        "SELECT COALESCE(SUM(current_bid), 0) as total FROM products WHERE seller_id = $1 AND status = 'sold'",
        [userId]
      );
      const sellerEarnings = parseFloat(salesResult.rows[0].total) || 0;

      const withdrawnResult = await pool.query(
        "SELECT COALESCE(SUM(amount), 0) as total FROM withdrawals WHERE user_id = $1 AND status IN ('pending', 'completed')",
        [userId]
      );
      const alreadyWithdrawn = parseFloat(withdrawnResult.rows[0].total) || 0;

      const available = referralBalance + sellerEarnings - alreadyWithdrawn;

      if (amount > available) {
        return res.status(400).json({
          success: false,
          message: `Insufficient balance. Available: $${available.toFixed(2)}`
        });
      }

      const result = await pool.query(
        `INSERT INTO withdrawals (user_id, amount, payment_method, payment_details, status) 
         VALUES ($1, $2, $3, $4, 'pending') RETURNING *`,
        [userId, amount, payment_method || 'cash', payment_details || '']
      );

      res.status(201).json({
        success: true,
        message: "Withdrawal request submitted successfully",
        data: result.rows[0]
      });
    } catch (error) {
      console.error("❌ [Withdraw] Error:", error);
      res.status(500).json({ success: false, message: "Internal server error" });
    }
  }
};
