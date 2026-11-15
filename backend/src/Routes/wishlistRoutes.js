import express from "express";
import { WishlistController } from "../controllers/wishlistController.js";
import { verifyUser } from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(verifyUser);

router.get("/", WishlistController.getWishlist);
router.post("/:productId", WishlistController.toggleWishlist);

export default router;
