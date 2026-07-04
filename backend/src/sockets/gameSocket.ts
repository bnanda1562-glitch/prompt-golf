import { Server, Socket } from 'socket.io';
import { GameManager } from '../services/GameManager.js';
import { AIServiceFactory } from '../services/AIService.js';
import { SimilarityService } from '../services/SimilarityService.js';
import { Submission } from '../models/Submission.js';
import { User } from '../models/User.js';
import { Room } from '../models/Room.js';
import { getRandomChallenges } from '../controllers/challengeController.js';

const gameManager = GameManager.getInstance();

export const initGameSockets = (io: Server) => {
  io.on('connection', (socket: Socket) => {
    console.log(`Socket connected: ${socket.id}`);

    // 1. Create Room Lobby
    socket.on('create-room', async (data: {
      userId: string;
      username: string;
      avatar: string;
      settings?: { totalRounds?: number; roundDuration?: number; maxPlayers?: number };
    }) => {
      try {
        const { userId, username, avatar, settings } = data;
        // Generate a random 5-letter Room Code
        const roomCode = Math.random().toString(36).substring(2, 7).toUpperCase();

        // Create Room record in MongoDB
        const dbRoom = await Room.create({
          roomCode,
          host: userId,
          players: [{
            user: userId,
            username,
            avatar,
            socketId: socket.id,
            ready: true,
            score: 0
          }],
          status: 'waiting',
          currentRound: 1,
          totalRounds: settings?.totalRounds || 3,
          roundDuration: settings?.roundDuration || 60,
          maxPlayers: settings?.maxPlayers || 8
        });

        const room = gameManager.createRoom(
          roomCode,
          userId,
          username,
          avatar,
          socket.id,
          settings,
          dbRoom._id.toString()
        );

        socket.join(roomCode);
        socket.emit('room-created', gameManager.serializeRoom(room));
        console.log(`Room created: ${roomCode} by ${username}`);
      } catch (err: any) {
        socket.emit('error-msg', { message: err.message || 'Failed to create room' });
      }
    });

    // 2. Join Room Lobby
    socket.on('join-room', (data: { roomCode: string; userId: string; username: string; avatar: string }) => {
      const { roomCode, userId, username, avatar } = data;
      const upperCode = roomCode.toUpperCase();

      const room = gameManager.joinRoom(upperCode, userId, username, avatar, socket.id);
      if (!room) {
        socket.emit('error-msg', { message: `Room ${upperCode} is full, in-progress, or does not exist.` });
        return;
      }

      socket.join(upperCode);
      io.to(upperCode).emit('player-joined', gameManager.serializeRoom(room));
      console.log(`Player ${username} joined room: ${upperCode}`);
    });

    // 3. Leave Room
    socket.on('leave-room', (data: { roomCode: string; userId: string }) => {
      const { roomCode, userId } = data;
      const upperCode = roomCode.toUpperCase();

      const room = gameManager.leaveRoom(upperCode, userId);
      socket.leave(upperCode);

      if (room) {
        io.to(upperCode).emit('player-left', gameManager.serializeRoom(room));
      }
      console.log(`User ${userId} left room: ${upperCode}`);
    });

    // 4. Toggle Ready Status
    socket.on('ready', (data: { roomCode: string; userId: string; readyState?: boolean }) => {
      const { roomCode, userId, readyState } = data;
      const upperCode = roomCode.toUpperCase();

      const room = gameManager.toggleReady(upperCode, userId, readyState);
      if (room) {
        io.to(upperCode).emit('score-update', gameManager.serializeRoom(room));
      }
    });

    // 5. Start Game
    socket.on('start-game', async (data: { roomCode: string }) => {
      const { roomCode } = data;
      const upperCode = roomCode.toUpperCase();

      const room = gameManager.getRoom(upperCode);
      if (!room) {
        socket.emit('error-msg', { message: 'Room not found' });
        return;
      }

      // Fetch random challenges from database based on totalRounds
      const challenges = await getRandomChallenges(room.totalRounds);
      if (challenges.length === 0) {
        socket.emit('error-msg', { message: 'No challenges found in database. Create challenges first.' });
        return;
      }

      const startedRoom = gameManager.startGame(upperCode, challenges);
      if (startedRoom) {
        io.to(upperCode).emit('game-started', gameManager.serializeRoom(startedRoom));
        console.log(`Game started in room: ${upperCode}`);

        // Start room timer
        runRoomTimer(io, upperCode);
      }
    });

    // 6. Submit Prompt
    socket.on('submit-prompt', async (data: {
      roomCode: string;
      userId: string;
      prompt: string;
      timeRemaining: number;
    }) => {
      const { roomCode, userId, prompt, timeRemaining } = data;
      const upperCode = roomCode.toUpperCase();

      const room = gameManager.getRoom(upperCode);
      if (!room || room.status !== 'playing') {
        socket.emit('error-msg', { message: 'Game is not active' });
        return;
      }

      const player = room.players.get(userId);
      if (!player || player.hasSubmitted) {
        socket.emit('error-msg', { message: 'Already submitted or not in game' });
        return;
      }

      try {
        const activeChallenge = room.challenges[room.currentRound - 1];
        if (!activeChallenge) {
          socket.emit('error-msg', { message: 'No active challenge found' });
          return;
        }

        // Call swappable AI Service to generate response and estimate tokens
        const aiService = AIServiceFactory.getService();
        const aiResponse = await aiService.generateResponse(prompt);
        const estimatedTokens = aiService.estimateTokens(prompt);
        const characters = prompt.length;

        // Evaluate Similarity and Score
        const similarity = SimilarityService.calculateSimilarity(activeChallenge.targetOutput, aiResponse);
        const score = SimilarityService.calculateScore(similarity, characters, timeRemaining, room.roundDuration);

        const submissionData = {
          prompt,
          characters,
          estimatedTokens,
          aiResponse,
          similarity,
          score
        };

        // Update in-memory room
        const updatedRoom = gameManager.submitPrompt(upperCode, userId, submissionData);

        // Persist submission to MongoDB in background
        await Submission.create({
          userId,
          roomId: room.dbId || null, // in-memory rooms map database ID to room.dbId
          challengeId: activeChallenge._id,
          prompt,
          characters,
          estimatedTokens,
          aiResponse,
          similarity,
          score
        });

        // Send direct feedback back to the player who submitted
        socket.emit('submission-result', {
          success: true,
          ...submissionData
        });

        if (updatedRoom) {
          // Broadcast score updates to everyone in room
          io.to(upperCode).emit('score-update', gameManager.serializeRoom(updatedRoom));

          // Check if everyone has submitted
          const allSubmitted = Array.from(updatedRoom.players.values()).every(p => p.hasSubmitted);
          if (allSubmitted) {
            gameManager.stopRoomTimer(upperCode);
            handleRoundEnd(io, updatedRoom);
          }
        }
      } catch (err: any) {
        console.error('Submission processing error:', err);
        socket.emit('submission-result', {
          success: false,
          message: err.message || 'Failed to evaluate prompt'
        });
      }
    });

    // 7. Request Next Round
    socket.on('next-round', (data: { roomCode: string }) => {
      const { roomCode } = data;
      const upperCode = roomCode.toUpperCase();

      const room = gameManager.getRoom(upperCode);
      if (!room || room.status !== 'playing') return;

      if (room.currentRound >= room.totalRounds) {
        // Game has finished entirely
        const endedRoom = gameManager.endGame(upperCode);
        if (endedRoom) {
          saveGameResultsToDatabase(endedRoom);
          io.to(upperCode).emit('game-ended', gameManager.serializeRoom(endedRoom));
        }
      } else {
        // Advance round
        const updatedRoom = gameManager.nextRound(upperCode);
        if (updatedRoom) {
          io.to(upperCode).emit('game-started', gameManager.serializeRoom(updatedRoom));
          runRoomTimer(io, upperCode);
        }
      }
    });

    // 8. Handle Disconnection
    socket.on('disconnect', () => {
      console.log(`Socket disconnected: ${socket.id}`);
      const disconnectResult = gameManager.handleDisconnect(socket.id);
      if (disconnectResult) {
        const { roomCode, roomState } = disconnectResult;
        if (roomState) {
          io.to(roomCode).emit('player-left', gameManager.serializeRoom(roomState));
        }
      }
    });
  });
};

// Orchestrate the timer ticking and round termination callbacks
const runRoomTimer = (io: Server, roomCode: string) => {
  gameManager.startRoomTimer(
    roomCode,
    (room) => {
      // Broadcast timer tick
      io.to(roomCode).emit('timer-update', { timer: room.timer });
    },
    (room) => {
      // Timer finished -> handle end of round
      handleRoundEnd(io, room);
    }
  );
};

// Handle End of Round operations (evaluating non-submissions, broadcasting results)
const handleRoundEnd = (io: Server, room: GameManager['rooms'] extends Map<string, infer R> ? R : any) => {
  // Anyone who hasn't submitted gets a default zero-submission entry
  for (const player of room.players.values()) {
    if (!player.hasSubmitted) {
      player.hasSubmitted = true;
      player.lastSubmission = {
        prompt: '[TIMEOUT]',
        characters: 0,
        estimatedTokens: 0,
        aiResponse: 'No prompt was submitted before the round timer expired.',
        similarity: 0,
        score: 0
      };
    }
  }

  io.to(room.roomCode).emit('round-ended', gameManager.serializeRoom(room));
};

// Increment ratings & games played stats for users when a match concludes
const saveGameResultsToDatabase = async (room: any) => {
  try {
    const players = Array.from(room.players.values()) as any[];
    if (players.length === 0) return;

    // Find player with highest final score
    let winnerId = '';
    let highestScore = -1;

    for (const player of players) {
      if (player.score > highestScore) {
        highestScore = player.score;
        winnerId = player.userId;
      }
    }

    // Update statistics for all participating users
    for (const player of players) {
      const isWinner = player.userId === winnerId;
      await User.findByIdAndUpdate(player.userId, {
        $inc: {
          gamesPlayed: 1,
          wins: isWinner ? 1 : 0,
          rating: isWinner ? 25 : -10 // simple ELO rating adjustment
        }
      });
    }
  } catch (err) {
    console.error('Error saving match end scores to database:', err);
  }
};
