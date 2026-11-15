import express from "express";
import { WalletController } from "../controllers/walletController.js";
import { verifyUser } from "../middleware/authMiddleware.js";

const router = express.Router();

// All routes require authentication
router.use(verifyUser);

// GET /api/wallet - Get unified wallet info
router.get("/", WalletController.getWallet);

// POST /api/wallet/withdraw - Request withdrawal
router.post("/withdraw", WalletController.requestWithdrawal);

export default router;


