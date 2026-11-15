
import express from "express";
import { MobileProductController } from "../controllers/mobileProductController.js";

const router = express.Router();

// Frontend 1.0.1 Dedicated Endpoints
// GET /api/company/products - Returns only verified company products
router.get("/company", MobileProductController.getCompanyProducts); // Alias
router.get("/company/products", MobileProductController.getCompanyProducts);

// GET /api/seller/products - Returns only marketplace products (non-company)
router.get("/seller", MobileProductController.getMarketplaceProducts); // Alias
router.get("/seller/products", MobileProductController.getMarketplaceProducts);

export default router;
