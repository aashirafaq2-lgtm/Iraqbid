import express from "express";
import { NotificationsController } from "../controllers/notificationsController.js";
import { verifyUser, verifyAdmin } from "../middleware/authMiddleware.js";
import { PushNotificationService } from "../services/pushNotificationService.js";

const router = express.Router();

// Device Token Registration (Called automatically by Mobile App on login/start)
router.post("/register-device", verifyUser, async (req, res) => {
  try {
    const { fcm_token, platform, device_name } = req.body;
    const result = await PushNotificationService.registerDeviceToken(
      req.user.id,
      fcm_token,
      platform,
      device_name
    );
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Admin Broadcast Push Notification (Target ALL users)
router.post("/broadcast", verifyAdmin, async (req, res) => {
  try {
    const { title, message, image_url, destination_screen, related_id } = req.body;
    const result = await PushNotificationService.broadcastToAll({
      title,
      message,
      imageUrl: image_url,
      destinationScreen: destination_screen || 'home',
      relatedId: related_id,
      adminUser: req.user
    });
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Admin Get Broadcast History
router.get("/broadcast-history", verifyAdmin, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const page = parseInt(req.query.page) || 1;
    const result = await PushNotificationService.getBroadcastHistory(limit, page);
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Standard User Notification Routes
router.get("/", verifyUser, NotificationsController.getNotifications);
router.get("/unread-count", verifyUser, NotificationsController.getUnreadCount);
router.post("/onesignal-sync", verifyUser, NotificationsController.syncOneSignalId);
router.get("/settings", verifyUser, NotificationsController.getSettings);
router.put("/settings", verifyUser, NotificationsController.updateSettings);
router.patch("/read/:id", verifyUser, NotificationsController.markAsRead);

export default router;
