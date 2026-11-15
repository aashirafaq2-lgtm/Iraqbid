import express from "express";
import { ReportController } from "../controllers/reportController.js";
import { verifyUser } from "../middleware/authMiddleware.js";

const router = express.Router();

// Publicly accessible for logged in users to report content
router.post("/", verifyUser, ReportController.createReport);

export default router;
