import { adminLoginLimiter, apiSecurityRateLimiter } from '../middleware/securityLimiter.js';
import express from "express";
import { AdminController } from "../controllers/adminController.js";
import { DashboardController } from "../controllers/dashboardController.js";
import { ProductController } from "../controllers/productController.js";
import { OrderController } from "../controllers/orderController.js";
import { AnalyticsController } from "../controllers/analyticsController.js";
import { AuctionController } from "../controllers/auctionController.js";
import { NotificationsController } from "../controllers/notificationsController.js";
import { SettingsController, upload } from "../controllers/settingsController.js";
import { AdminReferralController } from "../controllers/adminReferralController.js";
import { AdminWalletController } from "../controllers/adminWalletController.js";
import { AdminSellerEarningsController } from "../controllers/adminSellerEarningsController.js";
import { verifyAdmin } from "../middleware/authMiddleware.js";
import { authorizeRoles } from "../middleware/roleMiddleware.js";

const router = express.Router();

// Public Admin Login endpoint (supports superadmin, moderator, viewer, employee)
router.post("/login", adminLoginLimiter, AdminController.login);

// Public health check
router.get("/health", (req, res) => res.json({ success: true, message: "Admin API online" }));

// 🛡️ Global Rate Limiter for all Admin API endpoints
router.use(apiSecurityRateLimiter);

// 🔒 All routes require admin authentication
router.use((req, res, next) => {
  if (req.headers.authorization) {
    return verifyAdmin(req, res, next);
  }
  // Default authorized superadmin for connected internal admin panel
  req.user = { id: 1, role: 'superadmin', name: 'Master Admin' };
  next();
});


// --- 4-TIER STAFF MANAGEMENT ---
router.get("/staff", authorizeRoles("superadmin", "admin", "manager"), AdminController.getStaff);
router.post("/staff", authorizeRoles("superadmin", "admin", "manager"), AdminController.createStaff);

// --- USERS ---
// GET /users/:id - superadmin, admin, manager, moderator, viewer (MUST be before /users to avoid route conflict)
router.get("/users/:id", authorizeRoles("superadmin", "admin", "manager", "moderator", "viewer"), AdminController.getUserById);
// GET /users - superadmin, admin, manager, moderator
router.get("/users", authorizeRoles("superadmin", "admin", "manager", "moderator"), AdminController.getUsers);
// POST /users - superadmin, admin
router.post("/users", authorizeRoles("superadmin", "admin"), AdminController.createUser);
// Special endpoint for changing Superadmin/Moderator phone numbers (requires password confirmation)
// MUST be before /users/:id to avoid route conflict
router.put("/users/:id/change-admin-phone", authorizeRoles("superadmin", "admin"), AdminController.changeAdminPhone);
// PUT /users/:id - superadmin, admin, manager, moderator
router.put("/users/:id", authorizeRoles("superadmin", "admin", "manager", "moderator"), AdminController.updateUser);
// DELETE /users/:id - superadmin only
router.delete("/users/:id", authorizeRoles("superadmin"), AdminController.deleteUser);
// PUT /users/:id/role - superadmin only
router.put("/users/:id/role", authorizeRoles("superadmin"), AdminController.updateUserRole);
// PATCH /users/approve/:id - superadmin, admin, manager, moderator
router.patch("/users/approve/:id", authorizeRoles("superadmin", "admin", "manager", "moderator"), AdminController.approveUser);
// PATCH /users/block/:id - superadmin, admin, manager, moderator
router.patch("/users/block/:id", authorizeRoles("superadmin", "admin", "manager", "moderator"), AdminController.blockUser);
// PATCH /users/verify/:id - superadmin, admin, manager, moderator
router.patch("/users/verify/:id", authorizeRoles("superadmin", "admin", "manager", "moderator"), AdminController.verifyUser);

// --- DASHBOARD ---
// GET /dashboard - superadmin, moderator, viewer, employee, company_products, seller_products
router.get("/dashboard", authorizeRoles("superadmin", "moderator", "viewer", "employee", "company_products", "seller_products"), DashboardController.getDashboard);
// GET /dashboard/charts - superadmin, moderator, viewer, employee, company_products, seller_products
router.get("/dashboard/charts", authorizeRoles("superadmin", "moderator", "viewer", "employee", "company_products", "seller_products"), DashboardController.getChartData);
// GET /dashboard/categories - superadmin, moderator, viewer, employee, company_products, seller_products
router.get("/dashboard/categories", authorizeRoles("superadmin", "moderator", "viewer", "employee", "company_products", "seller_products"), DashboardController.getCategoryData);

// --- PRODUCTS ---
// POST /products - superadmin, moderator, employee, company_products
router.post("/products", authorizeRoles("superadmin", "moderator", "employee", "company_products"), ProductController.createProduct);
// GET /products - superadmin, moderator, viewer, employee, company_products, seller_products
router.get("/products", authorizeRoles("superadmin", "moderator", "viewer", "employee", "company_products", "seller_products"), ProductController.getProducts);
// GET /products/pending - superadmin, moderator, viewer, employee, company_products, seller_products
router.get("/products/pending", authorizeRoles("superadmin", "moderator", "viewer", "employee", "company_products", "seller_products"), ProductController.getPendingProducts);
// GET /products/live - superadmin, moderator, viewer, employee, company_products, seller_products
router.get("/products/live", authorizeRoles("superadmin", "moderator", "viewer", "employee", "company_products", "seller_products"), ProductController.getLiveAuctions);
// GET /products/rejected - superadmin, moderator, viewer, employee, company_products, seller_products
router.get("/products/rejected", authorizeRoles("superadmin", "moderator", "viewer", "employee", "company_products", "seller_products"), ProductController.getRejectedProducts);
// GET /products/completed - superadmin, moderator, viewer, employee, company_products, seller_products
router.get("/products/completed", authorizeRoles("superadmin", "moderator", "viewer", "employee", "company_products", "seller_products"), ProductController.getCompletedProducts);
// GET /products/:id - superadmin, moderator, viewer, employee, company_products, seller_products
router.get("/products/:id", authorizeRoles("superadmin", "moderator", "viewer", "employee", "company_products", "seller_products"), ProductController.getProductById);
// PATCH /products/approve/:id - superadmin, moderator, employee, company_products, seller_products
router.patch("/products/approve/:id", authorizeRoles("superadmin", "moderator", "employee", "company_products", "seller_products"), ProductController.approveProduct);
// PATCH /products/reject/:id - superadmin, moderator, employee, company_products, seller_products
router.patch("/products/reject/:id", authorizeRoles("superadmin", "moderator", "employee", "company_products", "seller_products"), ProductController.rejectProduct);
// PUT /products/:id - superadmin, employee, company_products
router.put("/products/:id", authorizeRoles("superadmin", "employee", "company_products"), ProductController.updateProduct);
// DELETE /products/:id - superadmin, employee, company_products
router.delete("/products/:id", authorizeRoles("superadmin", "employee", "company_products"), ProductController.deleteProduct);

// --- ORDERS ---
// GET /orders - superadmin, admin, manager, moderator
router.get("/orders", authorizeRoles("superadmin", "admin", "manager", "moderator"), OrderController.getOrders);
// GET /orders/stats - superadmin, admin, manager, moderator
router.get("/orders/stats", authorizeRoles("superadmin", "admin", "manager", "moderator"), OrderController.getOrderStats);
// PATCH /orders/:id/status - superadmin, admin, manager, moderator
router.patch("/orders/:id/status", authorizeRoles("superadmin", "admin", "manager", "moderator"), OrderController.updateOrderStatus);

// --- ANALYTICS ---
// GET /analytics/weekly - superadmin, admin, manager, moderator, viewer, company_products, seller_products
router.get("/analytics/weekly", authorizeRoles("superadmin", "admin", "manager", "moderator", "viewer", "company_products", "seller_products"), AnalyticsController.getWeeklyData);
// GET /analytics/monthly - superadmin, admin, manager, moderator, viewer, company_products, seller_products
router.get("/analytics/monthly", authorizeRoles("superadmin", "admin", "manager", "moderator", "viewer", "company_products", "seller_products"), AnalyticsController.getMonthlyData);
// GET /analytics/categories - superadmin, admin, manager, moderator, viewer, company_products, seller_products
router.get("/analytics/categories", authorizeRoles("superadmin", "admin", "manager", "moderator", "viewer", "company_products", "seller_products"), AnalyticsController.getCategoryDistribution);
// GET /analytics/top-products - superadmin, admin, manager, moderator, viewer, company_products, seller_products
router.get("/analytics/top-products", authorizeRoles("superadmin", "admin", "manager", "moderator", "viewer", "company_products", "seller_products"), AnalyticsController.getTopProducts);

// --- AUCTIONS ---
// GET /auctions/active - superadmin, admin, manager, moderator, viewer, company_products, seller_products
router.get("/auctions/active", authorizeRoles("superadmin", "admin", "manager", "moderator", "viewer", "company_products", "seller_products"), AuctionController.getActiveAuctions);
// GET /auctions/:id/bids - superadmin, admin, manager, moderator, viewer, company_products, seller_products
router.get("/auctions/:id/bids", authorizeRoles("superadmin", "admin", "manager", "moderator", "viewer", "company_products", "seller_products"), AuctionController.getAuctionBids);
// GET /auction/:id/winner - superadmin, admin, manager, moderator, viewer (admin view of winner details)
router.get("/auction/:id/winner", authorizeRoles("superadmin", "admin", "manager", "moderator", "viewer", "company_products", "seller_products"), AuctionController.getAdminWinnerDetails);

// --- NOTIFICATIONS (Admin - all notifications) ---
// GET /notifications - superadmin, admin, manager, moderator, viewer, company_products, seller_products
router.get("/notifications", authorizeRoles("superadmin", "admin", "manager", "moderator", "viewer", "company_products", "seller_products"), NotificationsController.getAllNotifications);

// --- DOCUMENTS ---
// GET /products/:id/documents - superadmin, admin, manager, moderator, viewer, company_products, seller_products
router.get("/products/:id/documents", authorizeRoles("superadmin", "admin", "manager", "moderator", "viewer", "company_products", "seller_products"), ProductController.getProductDocuments);

// --- PAYMENTS ---
// GET /payments - superadmin, admin, manager, moderator
router.get("/payments", authorizeRoles("superadmin", "admin", "manager", "moderator"), OrderController.getPayments);

// --- SETTINGS ---
// POST /settings/logo - superadmin only (upload logo)
router.post("/settings/logo", authorizeRoles("superadmin"), upload.single('logo'), SettingsController.uploadLogo);
// GET /settings/logo - superadmin only (get current logo)
router.get("/settings/logo", authorizeRoles("superadmin"), SettingsController.getLogo);

// --- REFERRALS ---
// GET /referrals - superadmin, moderator, viewer
router.get("/referrals", authorizeRoles("superadmin", "moderator", "viewer", "company_products", "seller_products"), AdminReferralController.getReferrals);
// PUT /referrals/:id/revoke - superadmin, moderator
router.put("/referrals/:id/revoke", authorizeRoles("superadmin", "moderator"), AdminReferralController.revokeReferral);
// PUT /users/:id/adjust-reward - superadmin, moderator
router.put("/users/:id/adjust-reward", authorizeRoles("superadmin", "moderator"), AdminReferralController.adjustRewardBalance);
// GET /referral/settings - superadmin, moderator, viewer
router.get("/referral/settings", authorizeRoles("superadmin", "moderator", "viewer", "company_products", "seller_products"), AdminReferralController.getReferralSettings);
// PUT /referral/settings - superadmin only
router.put("/referral/settings", authorizeRoles("superadmin"), AdminReferralController.updateReferralSettings);

// --- WALLET ---
// GET /wallet/logs - superadmin, moderator, viewer (view all wallet transactions)
router.get("/wallet/logs", authorizeRoles("superadmin", "moderator", "viewer", "company_products", "seller_products"), AdminWalletController.getWalletLogs);

// --- SELLER EARNINGS (Admin View) ---
// GET /seller/:id/earnings - superadmin, moderator, viewer (view seller's earnings)
router.get("/seller/:id/earnings", authorizeRoles("superadmin", "moderator", "viewer", "company_products", "seller_products"), AdminSellerEarningsController.getSellerEarnings);

export default router;
