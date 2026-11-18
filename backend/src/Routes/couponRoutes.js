import express from "express";
import { CouponController } from "../controllers/couponController.js";
import { verifyUser } from "../middleware/authMiddleware.js";
import { authorizeRoles } from "../middleware/roleMiddleware.js";

const router = express.Router();

// ==========================================
// 📱 Mobile / Buyer Endpoints
// ==========================================
router.post("/validate", verifyUser, CouponController.validateCoupon);
router.post("/apply", verifyUser, CouponController.applyCouponToOrder);

// ==========================================
// 🖥️ Admin Endpoints
// ==========================================
router.get("/admin", verifyUser, authorizeRoles("superadmin", "admin", "manager"), CouponController.getAdminCoupons);
router.post("/admin", verifyUser, authorizeRoles("superadmin", "admin"), CouponController.createCoupon);
router.put("/admin/:id", verifyUser, authorizeRoles("superadmin", "admin"), CouponController.updateCoupon);
router.delete("/admin/:id", verifyUser, authorizeRoles("superadmin", "admin"), CouponController.deleteCoupon);
router.get("/admin/transactions", verifyUser, authorizeRoles("superadmin", "admin", "manager"), CouponController.getCouponTransactions);
router.get("/admin/performance", verifyUser, authorizeRoles("superadmin", "admin", "manager"), CouponController.getInfluencerPerformance);

export default router;
