import express from "express";
import { MobileProductController } from "../controllers/mobileProductController.js";
import { verifyUser } from "../middleware/authMiddleware.js";
import { upload, handleSingleUpload } from "./uploadRoutes.js";

const router = express.Router();

// Public routes
router.get("/", MobileProductController.getAllProducts);
router.get("/company", MobileProductController.getCompanyProducts); // Simplified alias
router.get("/company/products", MobileProductController.getCompanyProducts); // Keep for compatibility
router.get("/seller", MobileProductController.getMarketplaceProducts); // Simplified alias
router.get("/seller/products", MobileProductController.getMarketplaceProducts); // Keep for compatibility

// Protected routes - MUST come before /:id route to avoid route conflicts
router.get("/mine", verifyUser, MobileProductController.getMyProducts);
// router.get("/seller/products", ... ) -> Replaced by marketplace route above. Use /mine for dashboard.
router.post("/create", verifyUser, MobileProductController.createProduct);
router.post("/seller/products", verifyUser, MobileProductController.createProduct); // Alias for /create
router.post("/upload", verifyUser, upload.single('image'), handleSingleUpload); // Alias for checklist
router.put("/:id", verifyUser, MobileProductController.updateProduct);
router.delete("/:id", verifyUser, MobileProductController.deleteProduct);

// Dynamic routes - MUST come last
router.get("/:id", MobileProductController.getProductById);

export default router;

