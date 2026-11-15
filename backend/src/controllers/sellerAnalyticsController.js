import pool from "../config/db.js";

export const SellerAnalyticsController = {
    // GET /api/seller/analytics
    async getSellerAnalytics(req, res) {
        try {
            const userId = req.user.id;
            const userRole = (req.user.role || '').toLowerCase().trim();

            // Only sellers can access this
            if (userRole !== 'seller_products' && userRole !== 'seller' && userRole !== 'user') {
                // Return zeros if not a seller instead of 403 to keep app stable
                return res.json({
                    success: true,
                    data: {
                        totalSales: 0,
                        activeProductsWithBids: 0,
                        biddingActivity: [],
                        revenueData: [],
                        successRate: 0,
                        totalProducts: 0
                    }
                });
            }

            // 1. Total Sales (Revenue from sold products)
            const salesResult = await pool.query(
                "SELECT COALESCE(SUM(current_bid), 0) as total_sales FROM products WHERE seller_id = $1 AND status = 'sold'",
                [userId]
            );
            const totalSales = parseFloat(salesResult.rows[0].total_sales) || 0;

            // 2. Active products with bids
            const activeBidsResult = await pool.query(
                "SELECT COUNT(DISTINCT id) as count FROM products WHERE seller_id = $1 AND status = 'approved' AND total_bids > 0 AND auction_end_time > NOW()",
                [userId]
            );
            const activeProductsWithBids = parseInt(activeBidsResult.rows[0].count) || 0;

            // 3. Success Rate (Percentage of approved products that are sold)
            const approvedCountResult = await pool.query(
                "SELECT COUNT(*) as count FROM products WHERE seller_id = $1 AND status IN ('approved', 'sold', 'ended')",
                [userId]
            );
            const approvedCount = parseInt(approvedCountResult.rows[0].count) || 0;

            const soldCountResult = await pool.query(
                "SELECT COUNT(*) as count FROM products WHERE seller_id = $1 AND status = 'sold'",
                [userId]
            );
            const soldCount = parseInt(soldCountResult.rows[0].count) || 0;

            const successRate = approvedCount > 0 ? Math.round((soldCount / approvedCount) * 100) : 0;

            // 4. Bidding Activity (Bids Received vs Date) - Last 7 days
            const biddingActivityQuery = `
        SELECT 
          DATE(b.created_at) as date,
          COUNT(*) as bids
        FROM bids b
        JOIN products p ON b.product_id = p.id
        WHERE p.seller_id = $1
          AND b.created_at >= NOW() - INTERVAL '7 days'
        GROUP BY DATE(b.created_at)
        ORDER BY date ASC
      `;
            const activityResult = await pool.query(biddingActivityQuery, [userId]);

            // 5. Revenue Data (Successive Sales vs Date) - Last 30 days
            const revenueDataQuery = `
        SELECT 
          DATE(auction_end_time) as date,
          SUM(current_bid) as revenue
        FROM products
        WHERE seller_id = $1
          AND status = 'sold'
          AND auction_end_time >= NOW() - INTERVAL '30 days'
        GROUP BY DATE(auction_end_time)
        ORDER BY date ASC
      `;
            const revenueResult = await pool.query(revenueDataQuery, [userId]);

            res.json({
                success: true,
                data: {
                    totalSales,
                    activeBids: activeProductsWithBids,
                    biddingActivity: activityResult.rows,
                    revenueData: revenueResult.rows,
                    successRate,
                    totalProducts: approvedCount
                }
            });

        } catch (error) {
            console.error("❌ [SellerAnalytics] Error:", error);
            res.status(500).json({
                success: false,
                message: "Internal server error"
            });
        }
    }
};
