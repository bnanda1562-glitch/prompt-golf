"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireAdmin = exports.authenticateJWT = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const authenticateJWT = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        res.status(401).json({ message: 'Authorization header is missing' });
        return;
    }
    const token = authHeader.split(' ')[1]; // Bearer <token>
    if (!token) {
        res.status(401).json({ message: 'Token is missing' });
        return;
    }
    try {
        const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET || 'super_secret_prompt_golf_token_key_12345');
        req.user = {
            id: decoded.id,
            username: decoded.username,
            email: decoded.email,
            role: decoded.role || 'user'
        };
        next();
    }
    catch (error) {
        res.status(403).json({ message: 'Token is invalid or expired' });
        return;
    }
};
exports.authenticateJWT = authenticateJWT;
// Admin authentication middleware
const requireAdmin = (req, res, next) => {
    if (!req.user || req.user.role !== 'admin') {
        res.status(403).json({ message: 'Admin access required' });
        return;
    }
    next();
};
exports.requireAdmin = requireAdmin;
