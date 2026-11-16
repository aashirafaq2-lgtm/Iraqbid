import pool from "../config/db.js";
import { OneSignalService } from "../services/oneSignalService.js";

/**
 * Send a notification to a specific user
 * @param {number|string} userId - Target User ID
 * @param {string} title - Notification title
 * @param {string} message - Notification message
 * @param {string} type - Notification type
 * @param {string|number} relatedId - ID of related entity (product, order, etc.)
 */
export async function notifyUser(userId, title, message, type, relatedId = null) {
    try {
        // 1. Save to database
        try {
            await pool.query(
                `INSERT INTO notifications (title, message, user_id, type, is_read, created_at)
         VALUES ($1, $2, $3, $4, false, CURRENT_TIMESTAMP)`,
                [title, message, userId, type]
            );
        } catch (dbError) {
            if (dbError.code === '42703' || dbError.message.includes('column')) {
                await pool.query(
                    `INSERT INTO notifications (message, user_id, is_read, created_at)
           VALUES ($1, $2, false, CURRENT_TIMESTAMP)`,
                    [message, userId]
                );
            } else {
                throw dbError;
            }
        }

        // 2. Send Push Notification via OneSignal
        const data = { type };
        if (relatedId) {
            data.productId = relatedId; // Standard field for deep linking in Flutter app
            if (type === 'order') data.orderId = relatedId;
        }

        await OneSignalService.sendToUser(userId, title, message, data);

        console.log(`✅ [notifyUser] Notification sent to user ${userId}`);
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

        if (adminResult.rows.length === 0) {
            console.warn('⚠️ [notifyAdmins] No admins found to notify');
            return;
        }

        // Use Promise.all for faster parallel delivery
        await Promise.all(
            adminResult.rows.map(admin => notifyUser(admin.id, title, message, type, relatedId))
        );

        console.log(`✅ [notifyAdmins] Sent "${type}" notification to ${adminResult.rows.length} admins`);
    } catch (error) {
        console.error('❌ [notifyAdmins] Error:', error.message);
    }
}

/**
 * Send a notification to all active users when a new product is published to live auction
 * @param {string} title - Notification title
 * @param {string} message - Notification message body
 * @param {string|number} productId - Published Product ID
 */
export async function notifyAllUsersNewProduct(title, message, productId) {
    try {
        console.log(`📣 [notifyAllUsersNewProduct] Broadcasting new product ${productId} to all users...`);
        
        // 1. Send push to all subscribers via OneSignal
        await OneSignalService.sendToAll(title, message, {
            type: 'product',
            productId: productId
        });

        // 2. Insert into notifications table for active users
        const usersResult = await pool.query(
            "SELECT id FROM users WHERE is_banned = FALSE AND (status IS NULL OR status = 'active') LIMIT 500"
        );

        if (usersResult.rows.length > 0) {
            const insertPromises = usersResult.rows.map(user =>
                pool.query(
                    `INSERT INTO notifications (title, message, user_id, type, is_read, created_at)
                     VALUES ($1, $2, $3, 'product', false, CURRENT_TIMESTAMP)`,
                    [title, message, user.id]
                ).catch(err => console.warn(`Could not insert notif for user ${user.id}:`, err.message))
            );
            await Promise.allSettled(insertPromises);
        }

        console.log(`✅ [notifyAllUsersNewProduct] Broadcast completed for product ${productId}`);
    } catch (error) {
        console.error('❌ [notifyAllUsersNewProduct] Error:', error.message);
    }
}
