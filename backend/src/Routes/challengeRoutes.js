import express from 'express';
import { ChallengeController } from '../controllers/challengeController.js';
import { verifyUser } from '../middleware/authMiddleware.js';

const router = express.Router();

// Middleware for optional auth: if token is present, decode user; if not, proceed without error
const optionalAuth = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  if (!authHeader) return next();
  return verifyUser(req, res, next);
};

// Daily Challenge
router.get('/daily', optionalAuth, ChallengeController.getDailyChallenge);

// Lucky Wheel Status (supports both /wheel/status and /status when mounted under /api/wheel)
router.get('/wheel/status', optionalAuth, ChallengeController.getWheelStatus);
router.get('/status', optionalAuth, ChallengeController.getWheelStatus);

// Lucky Wheel Spin (supports both /wheel/spin and /spin when mounted under /api/wheel)
router.post('/wheel/spin', verifyUser, ChallengeController.spinWheel);
router.post('/spin', verifyUser, ChallengeController.spinWheel);

export default router;
