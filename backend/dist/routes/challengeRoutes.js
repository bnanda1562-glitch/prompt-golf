"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const challengeController_js_1 = require("../controllers/challengeController.js");
const auth_js_1 = require("../middleware/auth.js");
const router = (0, express_1.Router)();
// Protect all challenge routes with JWT
router.use(auth_js_1.authenticateJWT);
router.get('/', challengeController_js_1.getChallenges);
router.post('/evaluate', challengeController_js_1.evaluateSoloPrompt);
router.get('/:id', challengeController_js_1.getChallengeById);
router.post('/', challengeController_js_1.createChallenge);
router.delete('/:id', challengeController_js_1.deleteChallenge);
exports.default = router;
