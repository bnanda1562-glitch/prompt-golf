"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getLeaderboard = exports.getProfile = exports.login = exports.register = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const User_js_1 = require("../models/User.js");
const Submission_js_1 = require("../models/Submission.js");
const generateToken = (userId, username, email, role = 'user') => {
    return jsonwebtoken_1.default.sign({ id: userId, username, email, role }, process.env.JWT_SECRET || 'super_secret_prompt_golf_token_key_12345', { expiresIn: '7d' });
};
// 1. Signup User
const register = async (req, res) => {
    try {
        const { username, email, password } = req.body;
        if (!username || !email || !password) {
            res.status(400).json({ message: 'All fields are required' });
            return;
        }
        // Check if user already exists
        const userExists = await User_js_1.User.findOne({ $or: [{ email }, { username }] });
        if (userExists) {
            res.status(400).json({ message: 'Username or email already exists' });
            return;
        }
        // Set role to admin for the first user, or default to user
        const userCount = await User_js_1.User.countDocuments();
        const role = userCount === 0 ? 'admin' : 'user';
        // Create user
        const avatarSeed = Math.floor(Math.random() * 1000);
        const avatar = `https://api.dicebear.com/7.x/identicon/svg?seed=${avatarSeed}`;
        const user = await User_js_1.User.create({
            username,
            email,
            password,
            role,
            avatar
        });
        const token = generateToken(user._id.toString(), user.username, user.email, user.role);
        res.status(201).json({
            token,
            user: {
                id: user._id,
                username: user.username,
                email: user.email,
                rating: user.rating,
                wins: user.wins,
                gamesPlayed: user.gamesPlayed,
                avatar: user.avatar,
                role: user.role
            }
        });
    }
    catch (error) {
        res.status(500).json({ message: error.message || 'Server registration error' });
    }
};
exports.register = register;
// 2. Login User
const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            res.status(400).json({ message: 'Email and password are required' });
            return;
        }
        // Find user (we don't deselect password in schema, so we query normally)
        const user = await User_js_1.User.findOne({ email });
        if (!user) {
            res.status(401).json({ message: 'Invalid credentials' });
            return;
        }
        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            res.status(401).json({ message: 'Invalid credentials' });
            return;
        }
        const token = generateToken(user._id.toString(), user.username, user.email, user.role);
        res.json({
            token,
            user: {
                id: user._id,
                username: user.username,
                email: user.email,
                rating: user.rating,
                wins: user.wins,
                gamesPlayed: user.gamesPlayed,
                avatar: user.avatar,
                role: user.role
            }
        });
    }
    catch (error) {
        res.status(500).json({ message: error.message || 'Server login error' });
    }
};
exports.login = login;
// 3. Get User Profile with Aggregate Stats
const getProfile = async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            res.status(400).json({ message: 'User ID missing from token payload' });
            return;
        }
        const user = await User_js_1.User.findById(userId);
        if (!user) {
            res.status(404).json({ message: 'User not found' });
            return;
        }
        // Query submissions to calculate statistics
        const submissions = await Submission_js_1.Submission.find({ userId })
            .populate('challengeId', 'targetOutput category difficulty')
            .sort({ createdAt: -1 });
        const totalSubmissions = submissions.length;
        let avgScore = 0;
        let avgSimilarity = 0;
        let bestSubmission = null;
        if (totalSubmissions > 0) {
            const sumScore = submissions.reduce((acc, sub) => acc + sub.score, 0);
            const sumSim = submissions.reduce((acc, sub) => acc + sub.similarity, 0);
            avgScore = sumScore / totalSubmissions;
            avgSimilarity = sumSim / totalSubmissions;
            // Find submission with the highest score
            let maxScore = -1;
            for (const sub of submissions) {
                if (sub.score > maxScore) {
                    maxScore = sub.score;
                    bestSubmission = sub;
                }
            }
        }
        // Calculate rating percentile/rank (just basic sorting rank for display)
        const rankingCount = await User_js_1.User.countDocuments({ rating: { $gt: user.rating } });
        const rank = rankingCount + 1;
        const winRate = user.gamesPlayed > 0 ? Math.round((user.wins / user.gamesPlayed) * 100) : 0;
        res.json({
            user: {
                id: user._id,
                username: user.username,
                email: user.email,
                rating: user.rating,
                wins: user.wins,
                gamesPlayed: user.gamesPlayed,
                avatar: user.avatar,
                role: user.role
            },
            stats: {
                avgScore: Math.round(avgScore),
                avgSimilarity: Math.round(avgSimilarity * 100) / 100,
                winRate,
                rank,
                bestPrompt: bestSubmission ? {
                    prompt: bestSubmission.prompt,
                    score: bestSubmission.score,
                    similarity: bestSubmission.similarity,
                    targetOutput: bestSubmission.challengeId?.targetOutput || 'N/A'
                } : null,
                recentMatches: submissions.slice(0, 10).map(sub => ({
                    id: sub._id,
                    prompt: sub.prompt,
                    aiResponse: sub.aiResponse,
                    score: sub.score,
                    similarity: sub.similarity,
                    characters: sub.characters,
                    targetOutput: sub.challengeId?.targetOutput || 'N/A',
                    category: sub.challengeId?.category || 'general',
                    difficulty: sub.challengeId?.difficulty || 'medium',
                    submittedAt: sub.submittedAt
                }))
            }
        });
    }
    catch (error) {
        res.status(500).json({ message: error.message || 'Server profile error' });
    }
};
exports.getProfile = getProfile;
// 4. Get Leaderboard
const getLeaderboard = async (req, res) => {
    try {
        const topPlayers = await User_js_1.User.find()
            .select('username rating wins gamesPlayed avatar')
            .sort({ rating: -1 })
            .limit(10);
        res.json(topPlayers.map((player, idx) => ({
            rank: idx + 1,
            id: player._id,
            username: player.username,
            rating: player.rating,
            wins: player.wins,
            gamesPlayed: player.gamesPlayed,
            avatar: player.avatar
        })));
    }
    catch (error) {
        res.status(500).json({ message: error.message || 'Server leaderboard error' });
    }
};
exports.getLeaderboard = getLeaderboard;
