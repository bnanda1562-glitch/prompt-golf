import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import { connectDB } from './config/db.js';
import authRoutes from './routes/authRoutes.js';
import challengeRoutes from './routes/challengeRoutes.js';
import { initGameSockets } from './sockets/gameSocket.js';

dotenv.config();

const app = express();
const httpServer = createServer(app);

// Configure CORS for Express
app.use(cors({
  origin: ['http://localhost:5173', 'http://127.0.0.1:5173'],
  credentials: true
}));

app.use(express.json());

// Request logger middleware
app.use((req, res, next) => {
  console.log(`[HTTP] ${req.method} ${req.path}`, req.body);
  next();
});

// Database connection
connectDB();

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/challenges', challengeRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', time: new Date() });
});

// Configure Socket.IO
const io = new Server(httpServer, {
  cors: {
    origin: ['http://localhost:5173', 'http://127.0.0.1:5173'],
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// Initialize Socket event handlers
initGameSockets(io);

const PORT = process.env.PORT || 5001;

httpServer.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
