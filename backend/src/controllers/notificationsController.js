import pool from "../config/db.js";

export const NotificationsController = {
  // GET /api/notifications
  async getNotifications(req, res) {
    try {
      const userId = req.user.id;
      const { read, limit = 50 } = req.query;

      let query = `
        SELECT * FROM notifications
        WHERE user_id = $1
      `;
      const params = [userId];

      if (read !== undefined) {
        query += ` AND is_read = $2`;
        params.push(read === 'true');
      }

      query += ` ORDER BY created_at DESC LIMIT $${params.length + 1}`;
      params.push(parseInt(limit));

      const result = await pool.query(query, params);

      res.json({
        success: true,
        data: result.rows,
        pagination: {
          total: result.rows.length,
          page: 1,
          limit: parseInt(limit) || 50,
          pages: 1
        }
      });
    } catch (error) {
      console.error("Error fetching notifications:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error"
      });
    }
  },

  // GET /api/notifications/unread-count
  async getUnreadCount(req, res) {
    try {
      const userId = req.user.id;
      const result = await pool.query(
        "SELECT COUNT(*) FROM notifications WHERE user_id = $1 AND is_read = false",
        [userId]
      );

      res.json({
        success: true,
        count: parseInt(result.rows[0].count)
      });
    } catch (error) {
      console.error("Error fetching unread count:", error);
      res.status(500).json({ success: false, message: "Internal server error" });
    }
  },

  // POST /api/notifications/onesignal-sync
  async syncOneSignalId(req, res) {
    try {
      const userId = req.user.id;
      const { onesignalId } = req.body;

      if (!onesignalId) {
        return res.status(400).json({ success: false, message: "onesignalId is required" });
      }

      // Check if column exists first to avoid crash
      try {
        await pool.query(
          "UPDATE users SET onesignal_id = $1 WHERE id = $2",
          [onesignalId, userId]
        );
      } catch (colError) {
        if (colError.code === '42703') {
          console.warn("⚠️ [OneSignalSync] onesignal_id column missing. Please run migration.");
          return res.status(200).json({
            success: true,
            message: "OneSignal ID synchronization skipped (column missing)",
            warning: "Migration needed for push notifications"
          });
        }
        throw colError;
      }

      res.json({
        success: true,
        message: "OneSignal ID synchronized successfully"
      });
    } catch (error) {
      console.error("Error syncing OneSignal ID:", error);
      res.status(500).json({ success: false, message: "Internal server error" });
    }
  },

  // PATCH /api/notifications/read/:id
  async markAsRead(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      // Verify notification belongs to user
      const notificationResult = await pool.query(
        "SELECT id FROM notifications WHERE id = $1 AND user_id = $2",
        [id, userId]
      );

      if (notificationResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Notification not found"
        });
      }

      // Update notification
      const result = await pool.query(
        "UPDATE notifications SET is_read = true WHERE id = $1 RETURNING *",
        [id]
      );

      res.json({
        success: true,
        message: "Notification marked as read",
        data: result.rows[0]
      });
    } catch (error) {
      console.error("Error updating notification:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error"
      });
    }
  },

  // ✅ Get All Notifications (Admin)
  async getAllNotifications(req, res) {
    try {
      const { read, user_id, limit = 100, page = 1 } = req.query;

      let query = `
        SELECT 
          n.*,
          u.name as user_name,
          u.email as user_email
        FROM notifications n
        LEFT JOIN users u ON n.user_id = u.id
        WHERE 1=1
      `;
      const params = [];
      let paramCount = 1;

      if (read !== undefined) {
        query += ` AND n.is_read = $${paramCount++}`;
        params.push(read === 'true');
      }

      if (user_id) {
        query += ` AND n.user_id = $${paramCount++}`;
        params.push(user_id);
      }

      query += ` ORDER BY n.created_at DESC LIMIT $${paramCount++} OFFSET $${paramCount}`;
      params.push(parseInt(limit), (parseInt(page) - 1) * parseInt(limit));

      const result = await pool.query(query, params);

      // Get total count
      let countQuery = `
        SELECT COUNT(*) as count
        FROM notifications n
        WHERE 1=1
      `;
      const countParams = [];
      let countParamCount = 1;

      if (read !== undefined) {
        countQuery += ` AND n.is_read = $${countParamCount++}`;
        countParams.push(read === 'true');
      }

      if (user_id) {
        countQuery += ` AND n.user_id = $${countParamCount++}`;
        countParams.push(user_id);
      }

      const countResult = await pool.query(countQuery, countParams);

      res.json({
        success: true,
        data: result.rows,
        pagination: {
          total: parseInt(countResult.rows[0].count),
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(parseInt(countResult.rows[0].count) / parseInt(limit))
        }
      });
    } catch (error) {
      console.error("Error fetching notifications:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error"
      });
    }
  },

  // POST /api/notifications/broadcast (Admin broadcast to all users)
  async broadcastNotification(req, res) {
    try {
      const { title, message, type = 'system' } = req.body;
      if (!title || !message) {
        return res.status(400).json({ success: false, message: 'Title and message are required' });
      }

      // Insert notification for all active/registered users
      const insertResult = await pool.query(`
        INSERT INTO notifications (user_id, title, message, type, is_read, read, created_at)
        SELECT id, $1, $2, $3, false, false, NOW()
        FROM users
        WHERE status IN ('approved', 'active') OR role != 'admin'
        RETURNING id;
      `, [title, message, type]);

      res.json({
        success: true,
        message: `Broadcast notification sent to ${insertResult.rowCount} users successfully`,
        count: insertResult.rowCount
      });
    } catch (error) {
      console.error('Error broadcasting notification:', error);
      res.status(500).json({ success: false, message: 'Internal server error: ' + error.message });
    }
  },

  // GET /api/notifications/settings
  async getSettings(req, res) {
    try {
      const userId = req.user.id;
      const result = await pool.query(
        "SELECT notification_preferences FROM users WHERE id = $1",
        [userId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ success: false, message: "User not found" });
      }

      // Default settings if null
      const defaultSettings = {
        email_notifications: true,
        product_approvals: true,
        user_reports: true,
        high_value_bids: true,
        system_updates: true,
        security_alerts: true
      };

      res.json({
        success: true,
        data: result.rows[0].notification_preferences || defaultSettings
      });
    } catch (error) {
      console.error("Error fetching settings:", error);
      res.status(500).json({ success: false, message: "Internal server error" });
    }
  },

  // PUT /api/notifications/settings
  async updateSettings(req, res) {
    try {
      const userId = req.user.id;
      const settings = req.body;

      // Merge with existing settings or defaults
      const currentResult = await pool.query(
        "SELECT notification_preferences FROM users WHERE id = $1",
        [userId]
      );

      const currentSettings = currentResult.rows[0]?.notification_preferences || {};
      const newSettings = { ...currentSettings, ...settings };

      const result = await pool.query(
        "UPDATE users SET notification_preferences = $1 WHERE id = $2 RETURNING notification_preferences",
        [newSettings, userId]
      );

      res.json({
        success: true,
        message: "Notification settings updated",
        data: result.rows[0].notification_preferences
      });
    } catch (error) {
      console.error("Error updating settings:", error);
      res.status(500).json({ success: false, message: "Internal server error" });
    }
  }
};

