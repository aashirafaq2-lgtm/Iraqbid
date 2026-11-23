import express from "express";
import pool from "../config/db.js";
import { verifyUser } from "../middleware/authMiddleware.js";

const router = express.Router();

/**
 * GET /api/vip/containers
 * Get all VIP auction containers (Lobby view)
 */
router.get("/containers", async (req, res) => {
    try {
        const containersResult = await pool.query(`
            SELECT * FROM vip_containers 
            ORDER BY 
              CASE 
                WHEN tier = 'gold' THEN 1 
                WHEN tier = 'silver' THEN 2 
                ELSE 3 
              END ASC, id ASC
        `);
        return res.json({
            success: true,
            data: containersResult.rows
        });
    } catch (error) {
        console.error("❌ [VIP Containers] Error:", error.message);
        return res.status(500).json({ success: false, message: error.message });
    }
});

/**
 * GET /api/vip/containers/:code/arena
 * Get active VIP live auction details for container arena
 */
router.get("/containers/:code/arena", async (req, res) => {
    try {
        const { code } = req.params;
        const decodedCode = decodeURIComponent(code);

        // 1. Get container info
        const containerRes = await pool.query(
            "SELECT * FROM vip_containers WHERE code = $1 OR code = $2 LIMIT 1",
            [code, decodedCode]
        );

        if (containerRes.rows.length === 0) {
            return res.status(404).json({ success: false, message: "VIP Container not found" });
        }

        const container = containerRes.rows[0];

        // 2. Get VIP Product associated with this container (or create/attach featured laptop/asset)
        let productRes = await pool.query(
            "SELECT * FROM products WHERE is_vip = true AND (container_code = $1 OR container_type = $2) LIMIT 1",
            [container.code, container.tier]
        );

        let product = productRes.rows[0];

        if (!product) {
            // Seed a high-end container product if not created yet (e.g. ASUS ROG Gaming Laptop)
            const insertProd = await pool.query(`
                INSERT INTO products (
                    title, description, starting_price, current_bid, 
                    is_vip, container_type, container_code, status, 
                    product_source, auction_end_time, image_url
                ) VALUES (
                    $1, $2, $3, $4, 
                    true, $5, $6, 'active', 
                    'company', CURRENT_TIMESTAMP + INTERVAL '2 hours', $7
                ) RETURNING *
            `, [
                container.tier === 'gold' ? 'ASUS ROG Strix SCAR 18 Gaming Laptop' : (container.tier === 'silver' ? 'Apple MacBook Pro 16" M3 Max' : 'PlayStation 5 Pro 2TB Edition'),
                'Core i9 14900HX • 64GB DDR5 • 2TB NVMe SSD • RTX 4090 16GB • 18" 2.5K 240Hz Nebula HDR Display',
                container.tier === 'gold' ? 800 : (container.tier === 'silver' ? 500 : 300),
                container.tier === 'gold' ? 860 : (container.tier === 'silver' ? 520 : 310),
                container.tier,
                container.code,
                'https://res.cloudinary.com/df9m0futv/image/upload/v1740000000/vip_laptop_rog.png'
            ]);
            product = insertProd.rows[0];
        }

        // 3. Get recent bids for this product
        const bidsRes = await pool.query(`
            SELECT b.id, b.amount, b.created_at, b.user_id,
                   COALESCE(u.name, 'VIP Bidder') as bidder_name,
                   COALESCE(u.vip_avatar_id, 'avatar_009') as avatar_id
            FROM bids b
            LEFT JOIN users u ON b.user_id = u.id
            WHERE b.product_id = $1
            ORDER BY b.amount DESC, b.created_at DESC
            LIMIT 10
        `, [product.id]);

        return res.json({
            success: true,
            data: {
                container,
                product,
                bids: bidsRes.rows,
                viewers_count: container.viewers_count || 1428,
                total_bidders: container.registered_bidders_count || 40
            }
        });
    } catch (error) {
        console.error("❌ [VIP Arena] Error:", error.message);
        return res.status(500).json({ success: false, message: error.message });
    }
});

/**
 * GET /api/vip/status
 * Check current logged in user VIP permissions
 */
router.get("/status", verifyUser, async (req, res) => {
    try {
        const userId = req.user.id;
        const userRes = await pool.query(
            "SELECT id, name, role, is_vip_bidder, vip_avatar_id FROM users WHERE id = $1",
            [userId]
        );
        if (userRes.rows.length === 0) {
            return res.status(404).json({ success: false, message: "User not found" });
        }
        const u = userRes.rows[0];
        const canBid = u.is_vip_bidder === true || ['admin', 'superadmin', 'super-admin'].includes(u.role);
        return res.json({
            success: true,
            data: {
                userId: u.id,
                name: u.name,
                isVipBidder: u.is_vip_bidder === true,
                canBid,
                vipAvatarId: u.vip_avatar_id || 'avatar_009'
            }
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
});

export default router;
