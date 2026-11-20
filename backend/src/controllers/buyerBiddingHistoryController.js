import pool from "../config/db.js";
import { fixImageUrlsInResponse } from "../utils/imageUrlFixer.js";

export const BuyerBiddingHistoryController = {
  // GET /api/buyer/bidding-history
  // Get buyer's complete bidding history with filters
  async getBiddingHistory(req, res) {
    try {
      console.log("=".repeat(60));
      console.log("🔵 API HIT: /buyer/bidding-history");
      console.log("=".repeat(60));
      
      const userId = req.user.id;
      const { status, page = 1, limit = 20 } = req.query;
      
      console.log("📋 Request Details:");
      console.log("   UserID:", userId);
      console.log("   Status filter:", status || "all");
      console.log("   Page:", page);
      console.log("   Limit:", limit);

      // =========================================================================
      // 🏆 SPECIALIZED WON QUERY (Includes won auctions AND Buy Now purchases)
      // =========================================================================
      if (status === 'won') {
        const wonCountQuery = `
          WITH user_won AS (
            SELECT o.id FROM orders o WHERE o.buyer_id = $1
            UNION ALL
            SELECT p.id FROM products p
            WHERE p.highest_bidder_id = $1
              AND (p.auction_end_time <= NOW() OR p.status IN ('sold', 'ended'))
              AND NOT EXISTS (SELECT 1 FROM orders o WHERE o.product_id = p.id AND o.buyer_id = $1)
          )
          SELECT COUNT(*) as total FROM user_won;
        `;
        const countRes = await pool.query(wonCountQuery, [userId]);
        const totalCount = parseInt(countRes.rows[0]?.total || 0);

        const offset = (parseInt(page) - 1) * parseInt(limit);
        const wonDataQuery = `
          WITH user_won AS (
            -- 1. All orders for this buyer (both Buy Now and won auctions)
            SELECT 
              o.id as order_id,
              o.order_number,
              o.product_id,
              o.created_at as won_date,
              COALESCE(o.original_amount, o.amount) as original_amount,
              COALESCE(o.discount_amount, 0) as discount_amount,
              COALESCE(o.final_price, o.amount) as final_price,
              o.coupon_code,
              COALESCE(o.delivery_status, o.status, 'pending') as order_status
            FROM orders o
            WHERE o.buyer_id = $1

            UNION ALL

            -- 2. Won auctions that do not have an order row in orders yet
            SELECT 
              NULL as order_id,
              NULL as order_number,
              p.id as product_id,
              p.auction_end_time as won_date,
              COALESCE(p.current_bid, p.starting_bid, 0) as original_amount,
              0 as discount_amount,
              COALESCE(p.current_bid, p.starting_bid, 0) as final_price,
              NULL as coupon_code,
              'pending' as order_status
            FROM products p
            WHERE p.highest_bidder_id = $1
              AND (p.auction_end_time <= NOW() OR p.status IN ('sold', 'ended'))
              AND NOT EXISTS (SELECT 1 FROM orders o WHERE o.product_id = p.id AND o.buyer_id = $1)
          )
          SELECT 
            uw.order_id as id,
            COALESCE(uw.order_id, uw.product_id) as bid_id,
            uw.product_id,
            p.title as product_title,
            p.image_url as product_image,
            p.category_id,
            c.name as category_name,
            p.status as product_status,
            p.auction_end_time,
            uw.won_date as bid_date,
            uw.won_date as created_at,
            uw.original_amount as amount,
            uw.original_amount,
            uw.discount_amount,
            uw.final_price,
            uw.original_amount as current_highest_bid,
            uw.coupon_code,
            uw.order_status,
            uw.order_status as delivery_status,
            'won' as bid_status,
            0 as hours_left,
            uw.order_id,
            uw.order_number,
            COALESCE((SELECT COUNT(*) FROM bids WHERE product_id = p.id), 1) as total_bids
          FROM user_won uw
          JOIN products p ON p.id = uw.product_id
          LEFT JOIN categories c ON c.id = p.category_id
          ORDER BY uw.won_date DESC
          LIMIT $2 OFFSET $3;
        `;
        const result = await pool.query(wonDataQuery, [userId, parseInt(limit), offset]);

        const fixedData = fixImageUrlsInResponse(result.rows).map(bid => ({
          ...bid,
          amount: parseFloat(bid.amount) || 0,
          current_highest_bid: bid.current_highest_bid ? parseFloat(bid.current_highest_bid) : null,
          hours_left: 0,
          original_amount: bid.original_amount ? parseFloat(bid.original_amount) : null,
          discount_amount: bid.discount_amount ? parseFloat(bid.discount_amount) : 0,
          final_price: bid.final_price ? parseFloat(bid.final_price) : null,
          coupon_code: bid.coupon_code || null
        }));

        console.log(`🏆 [getBiddingHistory] Returning ${fixedData.length} won items for buyer #${userId}`);

        return res.json({
          success: true,
          data: fixedData,
          analytics: {
            total_bids: totalCount,
            total_amount_bid: fixedData.reduce((s, i) => s + (parseFloat(i.final_price || i.amount) || 0), 0),
            active_bids: 0,
            won_bids: totalCount,
            lost_bids: 0,
            ended_bids: totalCount,
            win_rate: 100.0
          },
          pagination: {
            total: totalCount,
            page: parseInt(page),
            limit: parseInt(limit),
            pages: Math.ceil(totalCount / limit) || 1
          }
        });
      }

      let query = `
        SELECT 
          b.id as bid_id,
          b.amount::numeric as amount,
          b.created_at as bid_date,
          p.id as product_id,
          p.title as product_title,
          p.image_url as product_image,
          p.status as product_status,
          p.auction_end_time,
          COALESCE(p.current_bid::numeric, 0) as current_highest_bid,
          p.highest_bidder_id,
          CASE 
            WHEN p.auction_end_time > NOW() THEN 'active'
            WHEN p.auction_end_time <= NOW() AND p.highest_bidder_id = b.user_id THEN 'won'
            WHEN p.auction_end_time <= NOW() AND p.highest_bidder_id != b.user_id THEN 'lost'
            ELSE 'ended'
          END as bid_status,
          EXTRACT(EPOCH FROM (p.auction_end_time - NOW())) / 3600 as hours_left,
          o.id as order_id,
          o.coupon_code,
          o.discount_amount,
          o.original_amount,
          o.final_price,
          COALESCE(o.delivery_status, o.status, 'pending') as order_status
        FROM bids b
        LEFT JOIN products p ON b.product_id = p.id
        LEFT JOIN orders o ON o.product_id = p.id AND o.buyer_id = b.user_id
        WHERE b.user_id = $1
      `;
      const params = [userId];
      let paramCount = 2;

      // Filter by status if provided
      if (status) {
        if (status === 'active') {
          query += ` AND p.auction_end_time > NOW()`;
        } else if (status === 'won') {
          query += ` AND p.auction_end_time <= NOW() AND p.highest_bidder_id = $${paramCount}`;
          params.push(userId);
          paramCount++;
        } else if (status === 'lost') {
          query += ` AND p.auction_end_time <= NOW() AND p.highest_bidder_id != $${paramCount} AND p.highest_bidder_id IS NOT NULL`;
          params.push(userId);
          paramCount++;
        } else if (status === 'ended') {
          query += ` AND p.auction_end_time <= NOW()`;
        }
      }

      query += ` ORDER BY b.created_at DESC`;

      // Get total count for pagination
      let countQuery = `
        SELECT COUNT(*) as total
        FROM bids b
        LEFT JOIN products p ON b.product_id = p.id
        WHERE b.user_id = $1
      `;
      const countParams = [userId];
      let countParamCount = 2;

      if (status) {
        if (status === 'active') {
          countQuery += ` AND p.auction_end_time > NOW()`;
        } else if (status === 'won') {
          countQuery += ` AND p.auction_end_time <= NOW() AND p.highest_bidder_id = $${countParamCount}`;
          countParams.push(userId);
          countParamCount++;
        } else if (status === 'lost') {
          countQuery += ` AND p.auction_end_time <= NOW() AND p.highest_bidder_id != $${countParamCount} AND p.highest_bidder_id IS NOT NULL`;
          countParams.push(userId);
          countParamCount++;
        } else if (status === 'ended') {
          countQuery += ` AND p.auction_end_time <= NOW()`;
        }
      }

      const countResult = await pool.query(countQuery, countParams);
      const totalCount = parseInt(countResult.rows[0].total);

      // Get ALL bids for analytics (without pagination)
      let analyticsQuery = `
        SELECT 
          b.amount::numeric as amount,
          CASE 
            WHEN p.auction_end_time > NOW() THEN 'active'
            WHEN p.auction_end_time <= NOW() AND p.highest_bidder_id = b.user_id THEN 'won'
            WHEN p.auction_end_time <= NOW() AND p.highest_bidder_id != b.user_id THEN 'lost'
            ELSE 'ended'
          END as bid_status
        FROM bids b
        LEFT JOIN products p ON b.product_id = p.id
        WHERE b.user_id = $1
      `;
      const analyticsParams = [userId];
      let analyticsParamCount = 2;

      // Apply same status filter for analytics
      if (status) {
        if (status === 'active') {
          analyticsQuery += ` AND p.auction_end_time > NOW()`;
        } else if (status === 'won') {
          analyticsQuery += ` AND p.auction_end_time <= NOW() AND p.highest_bidder_id = $${analyticsParamCount}`;
          analyticsParams.push(userId);
          analyticsParamCount++;
        } else if (status === 'lost') {
          analyticsQuery += ` AND p.auction_end_time <= NOW() AND p.highest_bidder_id != $${analyticsParamCount} AND p.highest_bidder_id IS NOT NULL`;
          analyticsParams.push(userId);
          analyticsParamCount++;
        } else if (status === 'ended') {
          analyticsQuery += ` AND p.auction_end_time <= NOW()`;
        }
      }

      const analyticsResult = await pool.query(analyticsQuery, analyticsParams);
      const allBidsForAnalytics = analyticsResult.rows;

      // Calculate analytics from ALL bids (not just current page)
      // Ensure all amounts are converted to numbers
      const totalAmountBid = allBidsForAnalytics.reduce((sum, bid) => {
        const amount = typeof bid.amount === 'string' ? parseFloat(bid.amount) : (bid.amount || 0);
        return sum + (isNaN(amount) ? 0 : amount);
      }, 0);
      const activeBids = allBidsForAnalytics.filter(bid => bid.bid_status === 'active').length;
      const wonBids = allBidsForAnalytics.filter(bid => bid.bid_status === 'won').length;
      const lostBids = allBidsForAnalytics.filter(bid => bid.bid_status === 'lost').length;
      const endedBids = allBidsForAnalytics.filter(bid => bid.bid_status === 'ended').length;
      const winRate = totalCount > 0 
        ? parseFloat(((wonBids / totalCount) * 100).toFixed(2))
        : 0.0;

      // Add pagination
      const offset = (parseInt(page) - 1) * parseInt(limit);
      query += ` LIMIT $${paramCount++} OFFSET $${paramCount}`;
      params.push(parseInt(limit), offset);

      const result = await pool.query(query, params);
      
      console.log("📊 Query Results:");
      console.log("   Rows returned:", result.rows.length);
      console.log("   Total count (from count query):", totalCount);

      // Fix image URLs and convert numeric fields to numbers
      const fixedData = fixImageUrlsInResponse(result.rows).map(bid => ({
        ...bid,
        amount: parseFloat(bid.amount) || 0,
        current_highest_bid: bid.current_highest_bid ? parseFloat(bid.current_highest_bid) : null,
        hours_left: bid.hours_left ? parseFloat(bid.hours_left) : null,
        original_amount: bid.original_amount ? parseFloat(bid.original_amount) : null,
        discount_amount: bid.discount_amount ? parseFloat(bid.discount_amount) : 0,
        final_price: bid.final_price ? parseFloat(bid.final_price) : null,
        coupon_code: bid.coupon_code || null
      }));
      
      console.log("✅ Data processed:");
      console.log("   Fixed data count:", fixedData.length);
      if (fixedData.length > 0) {
        console.log("   Sample bid:", {
          bid_id: fixedData[0].bid_id,
          product_title: fixedData[0].product_title,
          amount: fixedData[0].amount,
          amount_type: typeof fixedData[0].amount,
          bid_status: fixedData[0].bid_status
        });
      }

      // Calculate analytics from ALL bids - ensure all values are numbers (not strings)
      const analytics = {
        total_bids: Number(parseInt(totalCount)) || 0,
        total_amount_bid: Number(parseFloat(totalAmountBid)) || 0.0,
        active_bids: Number(parseInt(activeBids)) || 0,
        won_bids: Number(parseInt(wonBids)) || 0,
        lost_bids: Number(parseInt(lostBids)) || 0,
        ended_bids: Number(parseInt(endedBids)) || 0,
        win_rate: Number(parseFloat(winRate)) || 0.0
      };
      
      // Double-check: Ensure all analytics values are actual numbers, not strings
      Object.keys(analytics).forEach(key => {
        const value = analytics[key];
        if (typeof value === 'string') {
          analytics[key] = key.includes('rate') || key.includes('amount') 
            ? parseFloat(value) || 0.0 
            : parseInt(value) || 0;
        }
      });

      const response = {
        success: true,
        data: fixedData,
        analytics: analytics,
        pagination: {
          total: totalCount,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(totalCount / limit)
        }
      };
      
      console.log("📤 Response Summary:");
      console.log("   Success: true");
      console.log("   Data items:", fixedData.length);
      console.log("   Analytics:", {
        total_bids: analytics.total_bids,
        total_amount: analytics.total_amount_bid,
        active: analytics.active_bids,
        won: analytics.won_bids,
        lost: analytics.lost_bids,
        win_rate: analytics.win_rate
      });
      console.log("   Pagination:", response.pagination);
      console.log("=".repeat(60));
      
      res.json(response);
    } catch (error) {
      console.error("=".repeat(60));
      console.error("❌ ERROR in /buyer/bidding-history:");
      console.error("   UserID:", req.user?.id || "unknown");
      console.error("   Error:", error.message);
      console.error("   Stack:", error.stack);
      console.error("=".repeat(60));
      
      res.status(500).json({
        success: false,
        message: "Internal server error"
      });
    }
  }
};


