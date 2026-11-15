import express from "express";
import { SellerAnalyticsController } from "../controllers/sellerAnalyticsController.js";
import { verifyUser } from "../middleware/authMiddleware.js";

const router = express.Router();

// GET /api/seller/analytics
router.get("/analytics", verifyUser, SellerAnalyticsController.getSellerAnalytics);

// POST /api/seller/onesignal-sync
// (Moved from notifications if needed, but checklist says POST /notifications/onesignal-sync)
// I will keep it consistent with the audit checklist in Phase 9.

export default router;
