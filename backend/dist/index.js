"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const http_1 = require("http");
const socket_io_1 = require("socket.io");
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const db_js_1 = require("./config/db.js");
const authRoutes_js_1 = __importDefault(require("./routes/authRoutes.js"));
const challengeRoutes_js_1 = __importDefault(require("./routes/challengeRoutes.js"));
const gameSocket_js_1 = require("./sockets/gameSocket.js");
dotenv_1.default.config();
const app = (0, express_1.default)();
const httpServer = (0, http_1.createServer)(app);
// Configure CORS for Express
app.use((0, cors_1.default)({
    origin: '*', // For development, allow any origin. In production, restrict to Vercel URL.
    credentials: true
}));
app.use(express_1.default.json());
// Database connection
(0, db_js_1.connectDB)();
// API Routes
app.use('/api/auth', authRoutes_js_1.default);
app.use('/api/challenges', challengeRoutes_js_1.default);
// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'ok', time: new Date() });
});
// Configure Socket.IO
const io = new socket_io_1.Server(httpServer, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST'],
        credentials: true
    }
});
// Initialize Socket event handlers
(0, gameSocket_js_1.initGameSockets)(io);
const PORT = process.env.PORT || 5001;
httpServer.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
