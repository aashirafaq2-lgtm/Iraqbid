import pool from "../config/db.js";
import { OneSignalService } from "../services/oneSignalService.js";
import { PushNotificationService } from "../services/pushNotificationService.js";

/**
 * Send a notification to a specific user (In-app DB + OneSignal + Firebase FCM Over-The-Air)
 * @param {number|string} userId - Target User ID
 * @param {string} title - Notification title
 * @param {string} message - Notification message
 * @param {string} type - Notification type ('outbid', 'bid', 'order', 'auction_won', etc.)
 * @param {string|number} relatedId - ID of related entity (product, order, etc.)
 */
export async function notifyUser(userId, title, message, type, relatedId = null) {
    try {
        // 1. Save to in-app database
        try {
            await pool.query(
                `INSERT INTO notifications (title, message, user_id, type, is_read, read, created_at)
         VALUES ($1, $2, $3, $4, false, false, CURRENT_TIMESTAMP)`,
                [title, message, userId, type]
            );
        } catch (dbError) {
            if (dbError.code === '42703' || dbError.message.includes('column')) {
                await pool.query(
                    `INSERT INTO notifications (message, user_id, is_read, read, created_at)
           VALUES ($1, $2, false, false, CURRENT_TIMESTAMP)`,
                    [message, userId]
                );
            } else {
                throw dbError;
            }
        }

        // 2. Send Push Notification via Firebase FCM (Over-the-air heads-up alert with sound)
        try {
            await PushNotificationService.sendToUser(userId, {
                title,
                message,
                destinationScreen: (type === 'outbid' || type === 'bid') ? 'product' : (type === 'order' ? 'orders' : 'home'),
                relatedId
            });
        } catch (fcmErr) {
            console.error('⚠️ [FCM notifyUser Notice]:', fcmErr.message);
        }

        // 3. Dual-delivery fallback via OneSignal
        try {
            const data = { type };
            if (relatedId) {
                data.productId = relatedId;
                if (type === 'order') data.orderId = relatedId;
            }
            await OneSignalService.sendToUser(userId, title, message, data);
        } catch (oneErr) {
            // Ignored if OneSignal not configured
        }

        console.log(`✅ [notifyUser] Push & In-App delivered to user ${userId} [${type}]: ${title}`);
    } catch (error) {
        console.error(`❌ [notifyUser] Error notifying user ${userId}:`, error.message);
    }
}

/**
 * Send a notification to all admin users (superadmin, admin, moderator)
 * @param {string} title - Notification title
 * @param {string} message - Notification message body
 * @param {string} type - Notification type (order, product, user, system)
 * @param {string|number} relatedId - ID of the related entity (optional)
 * @returns {Promise<void>}
 */
export async function notifyAdmins(title, message, type, relatedId = null) {
    try {
        const adminResult = await pool.query(
            "SELECT id FROM users WHERE role IN ('admin', 'superadmin', 'super-admin', 'moderator')"
        );

        if (adminResult.rows.length === 0) return;

        const promises = adminResult.rows.map(admin =>
            notifyUser(admin.id, title, message, type, relatedId)
        );

        await Promise.all(promises);
        console.log(`✅ [notifyAdmins] Notification sent to ${adminResult.rows.length} admins`);
    } catch (error) {
        console.error("❌ [notifyAdmins] Error notifying admins:", error.message);
    }
}

/**
 * Notify all users about a new product (Push Notification + in-app)
 */
export async function notifyAllUsersNewProduct(product) {
    try {
        const title = 'New Products Available!';
        const message = `New product "${product.title || product.name || 'Item'}" has just been added to IRAQ BID. Open the app now and start bidding!`;
        await PushNotificationService.broadcastToAll({
            title,
            message,
            destinationScreen: 'product',
            relatedId: product.id,
            imageUrl: product.image_url || (product.images && product.images[0]) || null
        });
        console.log(`✅ [notifyAllUsersNewProduct] Broadcast sent for product ${product.id}`);
    } catch (err) {
        console.error('❌ [notifyAllUsersNewProduct] Error:', err.message);
    }
}
