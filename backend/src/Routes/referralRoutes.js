import express from "express";
import { ReferralController } from "../controllers/referralController.js";
import { verifyUser } from "../middleware/authMiddleware.js";

const router = express.Router();

// Public referral endpoints
router.post("/click", ReferralController.recordClick);

// Protected referral endpoints
router.post("/create", verifyUser, ReferralController.createOrGetReferralCode);
router.get("/my-code", verifyUser, ReferralController.getMyReferralCode);
router.post("/claim", verifyUser, ReferralController.claimReferral);
router.get("/stats", verifyUser, ReferralController.getReferralStats);
router.get("/history", verifyUser, ReferralController.getReferralHistory);

// Public code validation (keep last so it doesn't shadow named routes)
router.get("/:code", ReferralController.validateReferralCode);

export default router;
