import pool from "../config/db.js";
import { fixImageUrlsInResponse } from "../utils/imageUrlFixer.js";

export const WishlistController = {
    // GET /api/wishlist
    async getWishlist(req, res) {
        try {
            const userId = req.user.id;

            const query = `
        SELECT 
          p.id, p.title, p.description, p.image_url, p.images, p.status,
          p.starting_price, p.current_bid as current_price, p.auction_end_time,
          COALESCE(c.name, 'Uncategorized') as category_name,
          w.created_at as added_at
        FROM wishlist w
        JOIN products p ON w.product_id = p.id
        LEFT JOIN categories c ON p.category_id = c.id
        WHERE w.user_id = $1
        ORDER BY w.created_at DESC
      `;

            const result = await pool.query(query, [userId]);
            const fixedData = fixImageUrlsInResponse(result.rows);

            res.json({
                success: true,
                data: fixedData
            });
        } catch (error) {
            console.error("❌ [Wishlist] Error:", error);
            res.status(500).json({ success: false, message: "Internal server error" });
        }
    },

    // POST /api/wishlist/:productId
    async toggleWishlist(req, res) {
        try {
            const userId = req.user.id;
            const { productId } = req.params;

            if (!productId || isNaN(parseInt(productId))) {
                return res.status(400).json({ success: false, message: "Invalid product ID" });
            }

            // Check if already in wishlist
            const checkResult = await pool.query(
                "SELECT id FROM wishlist WHERE user_id = $1 AND product_id = $2",
                [userId, productId]
            );

            if (checkResult.rows.length > 0) {
                // Remove from wishlist
                await pool.query(
                    "DELETE FROM wishlist WHERE user_id = $1 AND product_id = $2",
                    [userId, productId]
                );
                return res.json({
                    success: true,
                    message: "Product removed from wishlist",
                    is_favorite: false
                });
            } else {
                // Add to wishlist
                await pool.query(
                    "INSERT INTO wishlist (user_id, product_id) VALUES ($1, $2)",
                    [userId, productId]
                );
                return res.json({
                    success: true,
                    message: "Product added to wishlist",
                    is_favorite: true
                });
            }
        } catch (error) {
            console.error("❌ [WishlistToggle] Error:", error);
            res.status(500).json({ success: false, message: "Internal server error" });
        }
    }
};
