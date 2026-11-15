import express from "express";
import { MobileOrderController } from "../controllers/mobileOrderController.js";
import { verifyUser } from "../middleware/authMiddleware.js";

const router = express.Router();

// Protected routes
router.post("/create", verifyUser, MobileOrderController.createOrder);
router.get("/mine", verifyUser, MobileOrderController.getMyOrders);
router.post("/:id/confirm-receipt", verifyUser, MobileOrderController.confirmReceipt);

export default router;

