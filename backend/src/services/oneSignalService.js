import axios from 'axios';

/**
 * OneSignal Notification Service
 */
export const OneSignalService = {
    /**
     * Send notification to specific users via their OneSignal ID
     * @param {string[]} playerIds - Array of OneSignal User IDs
     * @param {string} heading - Notification title
     * @param {string} content - Notification message body
     * @param {object} data - Additional data (e.g., productId for deep linking)
     */
    async sendNotification(playerIds, heading, content, data = {}) {
        if (!playerIds || playerIds.length === 0) return;

        const appId = process.env.ONESIGNAL_APP_ID;
        const apiKey = process.env.ONESIGNAL_REST_API_KEY;

        if (!appId || !apiKey) {
            console.warn('⚠️ OneSignal credentials missing. Skipping push notification.');
            return;
        }

        try {
            const response = await axios.post(
                'https://onesignal.com/api/v1/notifications',
                {
                    app_id: appId,
                    include_player_ids: playerIds,
                    headings: { en: heading },
                    contents: { en: content },
                    data: data,
                },
                {
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Basic ${apiKey}`,
                    },
                }
            );

            console.log('✅ OneSignal notification sent successfully:', response.data);
            return response.data;
        } catch (error) {
            console.error('❌ Error sending OneSignal notification:', error.response?.data || error.message);
            // Don't throw to avoid crashing the main process
        }
    },

    /**
     * Helper to send notification using internal userId
     * @param {number|string} userId - Database User ID
     * @param {string} heading 
     * @param {string} content 
     * @param {object} data 
     */
    async sendToUser(userId, heading, content, data = {}) {
        try {
            const pool = (await import('../config/db.js')).default;
            const result = await pool.query(
                "SELECT onesignal_id FROM users WHERE id = $1",
                [userId]
            );

            const onesignalId = result.rows[0]?.onesignal_id;
            if (onesignalId) {
                return await this.sendNotification([onesignalId], heading, content, data);
            } else {
                console.log(`ℹ️ User ${userId} has no registered OneSignal ID. Skipping push.`);
            }
        } catch (error) {
            console.error('❌ Error in sendToUser:', error.message);
        }
    }
};
