import { Router } from 'express';
import {
  getChallenges,
  getChallengeById,
  createChallenge,
  deleteChallenge,
  evaluateSoloPrompt
} from '../controllers/challengeController.js';
import { authenticateJWT } from '../middleware/auth.js';

const router = Router();

// Protect all challenge routes with JWT
router.use(authenticateJWT);

router.get('/', getChallenges);
router.post('/evaluate', evaluateSoloPrompt);
router.get('/:id', getChallengeById);
router.post('/', createChallenge);
router.delete('/:id', deleteChallenge);

export default router;
