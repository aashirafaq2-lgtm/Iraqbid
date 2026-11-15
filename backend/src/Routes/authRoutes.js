import express from "express";
import { AuthController } from "../controllers/authController.js";
import { verifyUser } from "../middleware/authMiddleware.js";

const router = express.Router();

// ==================== MOBILE APP AUTHENTICATION ====================
// POST /api/auth/signup - New registration and send OTP
router.post("/signup", AuthController.signup);

// POST /api/auth/login - Check user exists and send OTP
router.post("/login", AuthController.login);

// POST /api/auth/send-otp - Generic send OTP endpoint
router.post("/send-otp", AuthController.sendOTP);

// POST /api/auth/verify-otp - Verify OTP and get token
router.post("/verify-otp", AuthController.verifyOTP);

// ==================== ADMIN PANEL AUTHENTICATION ====================
// POST /api/auth/admin-login - Admin Panel Direct Login (NO OTP)
router.post("/admin-login", AuthController.adminLogin);

// POST /api/auth/login-phone - Legacy endpoint (deprecated for admin panel)
router.post("/login-phone", AuthController.loginPhone);

// ==================== TOKEN REFRESH ====================
// POST /api/auth/refresh - Refresh access token
router.post("/refresh", AuthController.refreshToken);

// ==================== PROFILE ROUTES (PROTECTED) ====================
// GET /api/auth/profile - Get user profile
router.get("/profile", verifyUser, AuthController.getProfile);

// PATCH /api/auth/profile - Update user profile
router.patch("/profile", verifyUser, AuthController.updateProfile);

// ==================== CHANGE PHONE ROUTES (PROTECTED) ====================
// POST /api/auth/change-phone/send-otp - Send OTP to new phone number
router.post("/change-phone/send-otp", verifyUser, AuthController.sendChangePhoneOTP);

// POST /api/auth/change-phone/verify - Verify OTP and update phone number
router.post("/change-phone/verify", verifyUser, AuthController.verifyChangePhone);

// DELETE /api/auth/delete-account - Delete user account (Mandatory for App Store)
router.delete("/delete-account", verifyUser, AuthController.deleteAccount);

export default router;

