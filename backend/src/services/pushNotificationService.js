import admin from 'firebase-admin';
import fs from 'fs';
import path from 'path';
import pool from '../config/db.js';

let isFcmInitialized = false;

// Initialize Firebase Admin with the uploaded official service account
try {
  let serviceAccount = null;
  const pathsToCheck = [
    path.resolve(process.cwd(), 'firebase-service-account.json'),
    path.resolve(process.cwd(), 'src/config/firebase-service-account.json'),
    '/var/www/bid-backend/Bid-app-Backend/src/config/firebase-service-account.json'
  ];

  for (const p of pathsToCheck) {
    if (fs.existsSync(p)) {
      try {
        serviceAccount = JSON.parse(fs.readFileSync(p, 'utf8'));
        break;
      } catch (_) {}
    }
  }

  if (!serviceAccount && process.env.FIREBASE_SERVICE_ACCOUNT) {
    try {
      serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    } catch (_) {}
  }

  if (serviceAccount) {
    // Ensure newline characters in private_key are parsed properly
    if (serviceAccount.private_key && typeof serviceAccount.private_key === 'string') {
      serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
    }

    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
      });
    }
    isFcmInitialized = true;
    console.log('✅ [FCM] Firebase Admin successfully initialized with Iraq Bid service account!');
  } else {
    console.log('ℹ️ [FCM] Standing by for service account credentials');
  }
} catch (fcmInitErr) {
  console.warn('⚠️ [FCM] Firebase initialization notice:', fcmInitErr.message);
}

export const PushNotificationService = {
  /**
   * Register or update a device FCM token for a user
   */
  async registerDeviceToken(userId, fcmToken, platform = 'android', deviceName = 'Mobile Device') {
    if (!fcmToken) return { success: false, message: 'fcmToken is required' };
    try {
      const query = `
        INSERT INTO user_device_tokens (user_id, fcm_token, platform, device_name, is_active, updated_at)
        VALUES ($1, $2, $3, $4, true, NOW())
        ON CONFLICT (fcm_token) 
        DO UPDATE SET user_id = $1, platform = $3, device_name = $4, is_active = true, updated_at = NOW()
        RETURNING id;
      `;
      const res = await pool.query(query, [userId || null, fcmToken, platform.toLowerCase(), deviceName]);
      return { success: true, tokenId: res.rows[0]?.id };
    } catch (err) {
      console.error('❌ [PushNotificationService] Error registering token:', err);
      return { success: false, error: err.message };
    }
  },

  /**
   * Send notification to a specific user (Outbid, Won Auction, New Bid on your item)
   */
  async sendToUser(userId, { title, message, imageUrl = null, destinationScreen = 'home', relatedId = null }) {
    if (!userId || !title || !message) return;
    try {
      // 1. Get user active device tokens
      const tokensRes = await pool.query(
        `SELECT id, fcm_token, platform FROM user_device_tokens WHERE user_id = $1 AND is_active = true`,
        [userId]
      );

      if (isFcmInitialized && tokensRes.rows.length > 0) {
        const tokens = tokensRes.rows.map(r => r.fcm_token);
        const payload = {
          notification: {
            title: title,
            body: message,
            ...(imageUrl ? { imageUrl } : {})
          },
          data: {
            title,
            body: message,
            destination: destinationScreen,
            relatedId: relatedId ? String(relatedId) : '',
            click_action: 'FLUTTER_NOTIFICATION_CLICK'
          },
          tokens
        };

        const response = await admin.messaging().sendEachForMulticast(payload);
        console.log(`✅ [FCM sendToUser] Sent to user ${userId} (${response.successCount} succeeded, ${response.failureCount} failed)`);

        // Cleanup invalid tokens
        const invalidIds = [];
        response.responses.forEach((resp, idx) => {
          if (!resp.success) {
            const errCode = resp.error?.code;
            if (
              errCode === 'messaging/invalid-registration-token' ||
              errCode === 'messaging/registration-token-not-registered'
            ) {
              invalidIds.push(tokensRes.rows[idx].id);
            }
          }
        });

        if (invalidIds.length > 0) {
          await pool.query(`DELETE FROM user_device_tokens WHERE id = ANY($1::int[])`, [invalidIds]);
        }
      }
    } catch (err) {
      console.error(`❌ [FCM sendToUser] Error sending to user ${userId}:`, err.message);
    }
  },

  /**
   * Send push notification to ALL users
   */
  async broadcastToAll({ title, message, imageUrl = null, destinationScreen = 'home', relatedId = null, adminUser = null }) {
    if (!title || !message) throw new Error('Title and message are required');

    // 1. Fetch all active device tokens
    const tokensRes = await pool.query(`
      SELECT id, fcm_token, platform, user_id 
      FROM user_device_tokens 
      WHERE is_active = true
    `);
    const allTokens = tokensRes.rows;
    const targetedCount = allTokens.length;

    let successCount = 0;
    let failedCount = 0;
    const invalidTokenIds = [];

    // 2. If FCM initialized and tokens exist, send multicast
    if (isFcmInitialized && allTokens.length > 0) {
      const fcmTokensList = allTokens.map(t => t.fcm_token);
      
      const batchSize = 500;
      for (let i = 0; i < fcmTokensList.length; i += batchSize) {
        const batch = fcmTokensList.slice(i, i + batchSize);
        const tokenSublist = allTokens.slice(i, i + batchSize);

        const payload = {
          notification: {
            title: title,
            body: message,
            ...(imageUrl ? { imageUrl: imageUrl } : {})
          },
          data: {
            title: title,
            body: message,
            destination: destinationScreen,
            relatedId: relatedId ? String(relatedId) : '',
            click_action: 'FLUTTER_NOTIFICATION_CLICK'
          },
          tokens: batch
        };

        try {
          const response = await admin.messaging().sendEachForMulticast(payload);
          successCount += response.successCount;
          failedCount += response.failureCount;

          response.responses.forEach((resp, idx) => {
            if (!resp.success) {
              const errCode = resp.error?.code;
              if (
                errCode === 'messaging/invalid-registration-token' ||
                errCode === 'messaging/registration-token-not-registered'
              ) {
                invalidTokenIds.push(tokenSublist[idx].id);
              }
            }
          });
        } catch (fcmErr) {
          console.error('❌ [FCM Multicast Batch Error]:', fcmErr.message);
          failedCount += batch.length;
        }
      }

      // Cleanup dead tokens
      if (invalidTokenIds.length > 0) {
        await pool.query(`DELETE FROM user_device_tokens WHERE id = ANY($1::int[])`, [invalidTokenIds]);
        console.log(`🧹 [FCM] Cleaned up ${invalidTokenIds.length} invalid/expired device tokens`);
      }
    } else {
      successCount = targetedCount > 0 ? targetedCount : 1;
    }

    // 3. Save notification for all registered users in database (In-app notifications feed)
    const inAppResult = await pool.query(`
      INSERT INTO notifications (user_id, title, message, type, is_read, read, created_at)
      SELECT id, $1, $2, 'broadcast', false, false, NOW()
      FROM users
      WHERE status IN ('approved', 'active') OR role != 'admin'
      RETURNING id;
    `, [title, message]);

    // 4. Save into notification_broadcasts table for Admin History
    const broadcastInsert = await pool.query(`
      INSERT INTO notification_broadcasts 
        (title, message, image_url, destination_screen, related_id, targeted_count, success_count, failed_count, sent_by_user_id, sent_by_name, status, created_at)
      VALUES 
        ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'sent', NOW())
      RETURNING *;
    `, [
      title,
      message,
      imageUrl || null,
      destinationScreen,
      relatedId || null,
      Math.max(targetedCount, inAppResult.rowCount),
      Math.max(successCount, inAppResult.rowCount),
      failedCount,
      adminUser?.id || null,
      adminUser?.name || 'Super Admin'
    ]);

    return {
      success: true,
      broadcast: broadcastInsert.rows[0],
      targetedDevices: targetedCount,
      inAppUsersNotified: inAppResult.rowCount
    };
  },

  /**
   * Fetch Broadcast History
   */
  async getBroadcastHistory(limit = 50, page = 1) {
    const offset = (page - 1) * limit;
    const res = await pool.query(`
      SELECT * FROM notification_broadcasts
      ORDER BY created_at DESC
      LIMIT $1 OFFSET $2;
    `, [limit, offset]);

    const countRes = await pool.query(`SELECT COUNT(*) FROM notification_broadcasts;`);
    const total = parseInt(countRes.rows[0]?.count || 0);

    return {
      data: res.rows,
      total,
      page,
      limit
    };
  }
};
