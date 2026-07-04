"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.evaluateSoloPrompt = exports.getRandomChallenges = exports.deleteChallenge = exports.createChallenge = exports.getChallengeById = exports.getChallenges = void 0;
const Challenge_js_1 = require("../models/Challenge.js");
const AIService_js_1 = require("../services/AIService.js");
const SimilarityService_js_1 = require("../services/SimilarityService.js");
const Submission_js_1 = require("../models/Submission.js");
const User_js_1 = require("../models/User.js");
// 1. Get all challenges (optionally filter by difficulty or category)
const getChallenges = async (req, res) => {
    try {
        const { difficulty, category } = req.query;
        const filter = {};
        if (difficulty)
            filter.difficulty = difficulty;
        if (category)
            filter.category = category;
        const challenges = await Challenge_js_1.Challenge.find(filter).sort({ createdAt: -1 });
        res.json(challenges);
    }
    catch (error) {
        res.status(500).json({ message: error.message || 'Server error fetching challenges' });
    }
};
exports.getChallenges = getChallenges;
// 2. Get challenge by ID
const getChallengeById = async (req, res) => {
    try {
        const challenge = await Challenge_js_1.Challenge.findById(req.params.id);
        if (!challenge) {
            res.status(404).json({ message: 'Challenge not found' });
            return;
        }
        res.json(challenge);
    }
    catch (error) {
        res.status(500).json({ message: error.message || 'Server error fetching challenge' });
    }
};
exports.getChallengeById = getChallengeById;
// 3. Create a challenge
const createChallenge = async (req, res) => {
    try {
        const { targetOutput, difficulty, category } = req.body;
        if (!targetOutput || !category) {
            res.status(400).json({ message: 'targetOutput and category are required' });
            return;
        }
        const createdBy = req.user?.id || null;
        const challenge = await Challenge_js_1.Challenge.create({
            targetOutput,
            difficulty: difficulty || 'medium',
            category,
            createdBy
        });
        res.status(201).json(challenge);
    }
    catch (error) {
        res.status(500).json({ message: error.message || 'Server error creating challenge' });
    }
};
exports.createChallenge = createChallenge;
// 4. Delete a challenge
const deleteChallenge = async (req, res) => {
    try {
        const challenge = await Challenge_js_1.Challenge.findById(req.params.id);
        if (!challenge) {
            res.status(404).json({ message: 'Challenge not found' });
            return;
        }
        // Only creator or admin can delete
        if (req.user?.role !== 'admin' && challenge.createdBy?.toString() !== req.user?.id) {
            res.status(403).json({ message: 'Not authorized to delete this challenge' });
            return;
        }
        await challenge.deleteOne();
        res.json({ message: 'Challenge removed successfully' });
    }
    catch (error) {
        res.status(500).json({ message: error.message || 'Server error deleting challenge' });
    }
};
exports.deleteChallenge = deleteChallenge;
// 5. Get random challenges for game creation (Internal socket helper / API route)
const getRandomChallenges = async (count = 3) => {
    try {
        // MongoDB aggregation to sample random documents
        const challenges = await Challenge_js_1.Challenge.aggregate([
            { $sample: { size: count } }
        ]);
        return challenges;
    }
    catch (error) {
        console.error('Error fetching random challenges:', error);
        return [];
    }
};
exports.getRandomChallenges = getRandomChallenges;
// 6. Evaluate a Solo Play Prompt submission via REST endpoint
const evaluateSoloPrompt = async (req, res) => {
    try {
        const { challengeId, prompt, timeRemaining } = req.body;
        if (!challengeId || !prompt) {
            res.status(400).json({ message: 'challengeId and prompt are required' });
            return;
        }
        const challenge = await Challenge_js_1.Challenge.findById(challengeId);
        if (!challenge) {
            res.status(404).json({ message: 'Challenge not found' });
            return;
        }
        // Call swappable AI Service to generate response and estimate tokens
        const aiService = AIService_js_1.AIServiceFactory.getService();
        const aiResponse = await aiService.generateResponse(prompt);
        const estimatedTokens = aiService.estimateTokens(prompt);
        const characters = prompt.length;
        // Evaluate Similarity and Score
        const similarity = SimilarityService_js_1.SimilarityService.calculateSimilarity(challenge.targetOutput, aiResponse);
        const score = SimilarityService_js_1.SimilarityService.calculateScore(similarity, characters, timeRemaining || 60);
        // Save to Database
        const submission = await Submission_js_1.Submission.create({
            userId: req.user?.id,
            roomId: null, // Solo has no room ID
            challengeId,
            prompt,
            characters,
            estimatedTokens,
            aiResponse,
            similarity,
            score
        });
        // Update ELO rating and statistics for user on database
        await User_js_1.User.findByIdAndUpdate(req.user?.id, {
            $inc: {
                gamesPlayed: 1,
                wins: similarity >= 85 ? 1 : 0, // Mark a win if accuracy is 85% or above
                rating: similarity >= 85 ? 15 : -5 // ELO rating change
            }
        });
        res.json({
            prompt,
            characters,
            estimatedTokens,
            aiResponse,
            similarity,
            score,
            submittedAt: submission.submittedAt
        });
    }
    catch (error) {
        console.error('Solo prompt evaluation error:', error);
        res.status(500).json({ message: error.message || 'Prompt evaluation failed' });
    }
};
exports.evaluateSoloPrompt = evaluateSoloPrompt;
