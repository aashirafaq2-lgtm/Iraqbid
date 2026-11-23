import pool from "../config/db.js";
import { fixImageUrlsInResponse } from "../utils/imageUrlFixer.js";
import { notifyUser } from "../utils/notificationUtils.js";

export const BidsController = {
  // POST /api/bids/place
  async placeBid(req, res) {
    console.log('🧩 [BidPlace] Request received:', {
      body: req.body,
      userId: req.user?.id,
      userRole: req.user?.role,
      headers: { authorization: req.headers.authorization ? 'present' : 'missing' }
    });

    try {
      // Step 1: Validate user authentication
      if (!req.user || !req.user.id) {
        console.log('🧩 [BidError] Reason: User not authenticated - req.user is missing or has no id');
        return res.status(401).json({
          success: false,
          message: "Unauthorized - User authentication required"
        });
      }

      const buyerId = req.user.id;
      console.log('🧩 [BidPlace] Authenticated user:', { id: buyerId, role: req.user.role });

      // Step 2: Validate request body
      const { productId, amount } = req.body;

      if (!productId) {
        console.log('🧩 [BidError] Reason: productId is missing from request body');
        return res.status(400).json({
          success: false,
          message: "Product ID is required"
        });
      }

      if (amount === undefined || amount === null || amount === '') {
        console.log('🧩 [BidError] Reason: amount is missing from request body');
        return res.status(400).json({
          success: false,
          message: "Bid amount is required"
        });
      }

      // Step 3: Validate amount is numeric and positive
      const bidAmount = parseFloat(amount);
      if (isNaN(bidAmount) || !isFinite(bidAmount)) {
        console.log('🧩 [BidError] Reason: amount is not a valid number', { received: amount });
        return res.status(400).json({
          success: false,
          message: "Bid amount must be a valid number"
        });
      }

      if (bidAmount <= 0) {
        console.log('🧩 [BidError] Reason: amount must be greater than 0', { received: bidAmount });
        return res.status(400).json({
          success: false,
          message: "Bid amount must be greater than 0"
        });
      }

      // Step 4: Validate productId is numeric
      const productIdNum = parseInt(productId);
      if (isNaN(productIdNum) || !isFinite(productIdNum)) {
        console.log('🧩 [BidError] Reason: productId is not a valid number', { received: productId });
        return res.status(400).json({
          success: false,
          message: "Product ID must be a valid number"
        });
      }

      // Step 5: Validate user role (case-insensitive check)
      const userRole = req.user.role?.toLowerCase();
      const blockedRoles = []; // Empty = allow all roles

      if (blockedRoles.includes(userRole)) {
        console.log('🧩 [BidError] Reason: User role is blocked from bidding', { role: req.user.role });
        return res.status(403).json({
          success: false,
          message: `Your role (${req.user.role}) cannot place bids`
        });
      }

      // Step 8: Start transaction for atomic bid placement
      console.log('🧩 [BidPlace] Starting transaction to place bid:', {
        productId: productIdNum,
        userId: buyerId,
        amount: bidAmount
      });

      await pool.query('BEGIN');

      try {
        // Step 9: Verify product and LOCK the row for update
        // This prevents other transactions from modifying this product until we commit
        console.log('🧩 [BidPlace] Fetching and locking product for update...');
        const productResult = await pool.query(
          "SELECT * FROM products WHERE id = $1 FOR UPDATE",
          [productIdNum]
        );

        if (productResult.rows.length === 0) {
          throw { status: 404, message: `Product with ID ${productIdNum} not found` };
        }

        const product = productResult.rows[0];

        // Step 9.1: VIP AUCTION PERMISSION CHECK
        if (product.is_vip === true) {
          const userVipCheck = await pool.query(
            "SELECT is_vip_bidder, role FROM users WHERE id = $1",
            [buyerId]
          );
          const isVip = userVipCheck.rows[0]?.is_vip_bidder === true || 
                        ['admin', 'superadmin', 'super-admin'].includes(userVipCheck.rows[0]?.role);
          if (!isVip) {
            console.log('🧩 [BidError] VIP auction bid rejected: User is not an authorized VIP bidder', { buyerId });
            throw {
              status: 403,
              message: "Only authorized VIP bidders can place bids in this VIP Container auction. Regular bidders can watch the live auction."
            };
          }
        }

        // Capture the immediate previous highest bidder BEFORE updating
        const previousHighestBidderId = product.highest_bidder_id;
        const previousHighestBidAmount = parseFloat(product.current_bid) || parseFloat(product.starting_bid) || 0;

        // Step 10: Perform all validations inside the lock

        // Check if seller is trying to bid on their own product
        if (product.seller_id === buyerId) {
          throw { status: 400, message: "You cannot bid on your own product" };
        }

        // Check product status
        if (product.status !== 'approved') {
          throw { status: 400, message: `Product is not available for bidding (status: ${product.status})` };
        }

        // Check if auction has ended
        const now = new Date();
        const endTime = new Date(product.auction_end_time);

        if (product.auction_end_time && endTime < now) {
          console.log('🧩 [BidError] Reason: Auction has ended (Late bid rejected)', {
            auction_end_time: product.auction_end_time,
            server_time: now.toISOString()
          });
          throw {
            status: 400,
            message: "Auction has ended. Late bids are not accepted.",
            data: { server_time: now.toISOString(), auction_end_time: product.auction_end_time }
          };
        }

        // Step 11: Get current highest bid and validate new bid is higher
        const currentBid = parseFloat(product.current_bid) || parseFloat(product.starting_bid) || 0;

        if (bidAmount <= currentBid) {
          console.log('🧩 [BidError] Reason: Bid amount must be higher than current bid', {
            currentBid,
            newBid: bidAmount
          });
          throw { status: 400, message: `Bid amount must be higher than current bid (${currentBid})` };
        }

        // Step 12: Insert bid
        console.log('🧩 [BidPlace] Inserting bid into database...');
        const bidResult = await pool.query(
          `INSERT INTO bids (product_id, user_id, amount) 
           VALUES ($1, $2, $3) 
           RETURNING *`,
          [productIdNum, buyerId, bidAmount]
        );

        if (!bidResult.rows || bidResult.rows.length === 0) {
          throw new Error('Bid insert returned no rows');
        }

        const newBid = bidResult.rows[0];

        // Update product with new highest bid
        console.log('🧩 [BidPlace] Updating product with new highest bid...');
        await pool.query(
          `UPDATE products 
           SET current_bid = $1, 
               current_price = $1,
               highest_bidder_id = $2,
               total_bids = COALESCE(total_bids, 0) + 1,
               updated_at = CURRENT_TIMESTAMP
           WHERE id = $3`,
          [bidAmount, buyerId, productIdNum]
        );

        // Update user bids count
        try {
          await pool.query(
            `UPDATE users 
             SET bids_count = COALESCE(bids_count, 0) + 1 
             WHERE id = $1`,
            [buyerId]
          );
        } catch (bidsCountError) {
          if (bidsCountError.code !== '42703') throw bidsCountError;
          console.log('🧩 [BidPlace] Warning: bids_count column missing, skipping user update');
        }

        await pool.query('COMMIT');
        console.log('🧩 [BidPlace] ✅ Transaction committed successfully');

        // Create notification for seller about new bid
        try {
          await notifyUser(
            product.seller_id,
            'New Bid Placed',
            `Someone placed a bid of $${bidAmount} on your product "${product.title}"`,
            'bid',
            productIdNum
          );
          console.log('✅ [BidPlace] Notification sent to seller');
        } catch (notifError) {
          console.log('⚠️ [BidPlace] Failed to notify seller:', notifError.message);
        }

        // Notify ONLY the immediately previous highest bidder (Exact Client Requirement)
        try {
          if (
            previousHighestBidderId && 
            previousHighestBidderId !== buyerId && 
            bidAmount > previousHighestBidAmount
          ) {
            await notifyUser(
              previousHighestBidderId,
              'You’ve Been Outbid!',
              `Someone placed a higher bid of $${bidAmount} on ${product.title}. Place a new bid now!`,
              'outbid',
              productIdNum
            );
            console.log(`✅ [BidPlace] Outbid notification sent ONLY to previous highest bidder: ${previousHighestBidderId}`);
          } else {
            console.log('ℹ️ [BidPlace] No previous outbid notification needed (first bid or same bidder outbidding self)');
          }
        } catch (biddersNotifError) {
          console.log('⚠️ [BidPlace] Failed to notify previous highest bidder:', biddersNotifError.message);
        }

        // Prepare response data
        const responseData = {
          id: newBid.id,
          product_id: newBid.product_id,
          user_id: newBid.user_id,
          amount: parseFloat(newBid.amount),
          created_at: newBid.created_at
        };

        console.log('🧩 [BidPlace] Sending response:', responseData);

        // Prepare real-time notification data
        const io = req.app.get('io');
        if (io) {
          const updateData = {
            productId: productIdNum,
            currentPrice: bidAmount,
            totalBids: (parseInt(product.total_bids) || 0) + 1,
            lastBidderName: req.user.name || 'Anonymous',
            timestamp: new Date().toISOString()
          };

          console.log(`📡 [Socket] Emitting bid_updated for product_${productIdNum}:`, updateData);
          io.to(`product_${productIdNum}`).emit('bid_updated', updateData);
        }

        try {
          const jsonResponse = {
            success: true,
            message: "Bid placed successfully",
            data: responseData,
            server_time: new Date().toISOString()
          };

          console.log('🧩 [BidPlace] Sending success response:', jsonResponse);
          res.status(201).json(jsonResponse);
        } catch (responseError) {
          console.log('🧩 [BidError] Reason: Error sending response', {
            error: responseError.message,
            stack: responseError.stack
          });
          // Response already sent or error sending response
          throw responseError;
        }
      } catch (dbError) {
        await pool.query('ROLLBACK');
        console.log('🧩 [BidError] Reason: Database error during bid insertion', {
          error: dbError.message,
          code: dbError.code,
          detail: dbError.detail,
          constraint: dbError.constraint,
          table: dbError.table,
          column: dbError.column
        });

        // Handle specific database errors
        if (dbError.code === '23503') { // Foreign key violation
          return res.status(400).json({
            success: false,
            message: "Invalid product or user reference"
          });
        }
        if (dbError.code === '23505') { // Unique constraint violation
          return res.status(400).json({
            success: false,
            message: "Bid already exists"
          });
        }
        if (dbError.code === '23514') { // Check constraint violation
          return res.status(400).json({
            success: false,
            message: "Bid amount violates constraint"
          });
        }

        throw dbError; // Re-throw to be caught by outer catch
      }
    } catch (error) {
      console.log('🧩 [BidError] Reason: Unexpected error in placeBid', {
        error: error.message,
        stack: error.stack,
        name: error.name
      });

      // Return appropriate error based on error type
      if (error.name === 'TypeError' && error.message.includes('Cannot read')) {
        return res.status(400).json({
          success: false,
          message: "Invalid request data format"
        });
      }

      res.status(500).json({
        success: false,
        message: "Internal server error while placing bid",
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  },

  // GET /api/bids/:productId
  async getBidsByProduct(req, res) {
    try {
      const { productId } = req.params;

      // 1. Fetch full bids history for product with bidder names and timestamps
      const result = await pool.query(
        `SELECT 
          b.id,
          b.product_id,
          b.user_id,
          b.amount,
          b.created_at,
          COALESCE(u.name, 'Bidder ' || b.user_id) as bidder_name
        FROM bids b
        LEFT JOIN users u ON b.user_id = u.id
        WHERE b.product_id = $1
        ORDER BY b.amount DESC, b.created_at DESC`,
        [productId]
      );

      // 2. Count total bids and unique bidders
      const totalBids = result.rows.length;
      const uniqueBidders = new Set(result.rows.map(r => r.user_id)).size;
      const highestBid = result.rows[0] || null;

      res.json({
        success: true,
        data: result.rows,
        summary: {
          total_bids: totalBids,
          unique_bidders: uniqueBidders,
          highest_bid: highestBid,
          highest_bidder_name: highestBid?.bidder_name || null
        }
      });
    } catch (error) {
      console.error("Error fetching bids:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error"
      });
    }
  },

  // GET /api/bids/mine
  async getMyBids(req, res) {
    try {
      const userId = req.user.id;
      const { status } = req.query;

      let query;
      const params = [userId];

      if (status === 'all' || status === 'history') {
        // Return full bidding history
        query = `
          SELECT 
            b.*,
            p.title as product_title,
            p.image_url as product_image,
            p.status as product_status,
            p.auction_end_time,
            EXTRACT(EPOCH FROM (p.auction_end_time - NOW())) / 3600 as hours_left,
            CASE 
              WHEN p.auction_end_time > NOW() AND p.status IN ('approved', 'active') THEN 'live'
              ELSE 'ended'
            END as auction_status
          FROM bids b
          LEFT JOIN products p ON b.product_id = p.id
          WHERE b.user_id = $1
          ORDER BY b.created_at DESC
        `;
      } else {
        // Default for Mobile App Bids screen: ONLY active, live auctions that have NOT finished!
        // Finished auctions (00h 00m 00s, ended, sold) must be gone from active bids!
        query = `
          SELECT * FROM (
            SELECT DISTINCT ON (b.product_id)
              b.id,
              b.product_id,
              b.user_id,
              b.amount,
              b.created_at,
              b.is_special_bid,
              p.title as product_title,
              p.image_url as product_image,
              p.status as product_status,
              p.auction_end_time,
              COALESCE(p.current_bid, b.amount) as product_current_bid,
              p.highest_bidder_id as product_highest_bidder_id,
              CASE WHEN p.highest_bidder_id = b.user_id THEN true ELSE false END as is_highest_bidder,
              EXTRACT(EPOCH FROM (p.auction_end_time - NOW())) / 3600 as hours_left,
              'live' as auction_status
            FROM bids b
            JOIN products p ON b.product_id = p.id
            WHERE b.user_id = $1
              AND p.status IN ('approved', 'active')
              AND p.auction_end_time IS NOT NULL
              AND p.auction_end_time > NOW()
            ORDER BY b.product_id, b.created_at DESC
          ) sub
          ORDER BY sub.created_at DESC
        `;
      }

      const result = await pool.query(query, params);

      // Fix invalid image URLs in response
      const fixedData = fixImageUrlsInResponse(result.rows);

      res.json({
        success: true,
        data: fixedData
      });
    } catch (error) {
      console.error("Error fetching bids:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error"
      });
    }
  }
};

