import { Router } from 'express';
import { register, login, getProfile, getLeaderboard } from '../controllers/authController.js';
import { authenticateJWT } from '../middleware/auth.js';

const router = Router();

router.post('/register', register);
router.post('/login', login);
router.get('/profile', authenticateJWT, getProfile);
router.get('/leaderboard', authenticateJWT, getLeaderboard);

export default router;
