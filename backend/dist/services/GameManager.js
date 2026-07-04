"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GameManager = void 0;
class GameManager {
    static instance;
    rooms = new Map();
    constructor() { }
    static getInstance() {
        if (!GameManager.instance) {
            GameManager.instance = new GameManager();
        }
        return GameManager.instance;
    }
    // Create an in-memory game room
    createRoom(roomCode, hostId, hostUsername, hostAvatar, socketId, settings = {}, dbId) {
        const hostPlayer = {
            userId: hostId,
            username: hostUsername,
            avatar: hostAvatar,
            socketId,
            ready: true, // Host is ready by default
            score: 0,
            hasSubmitted: false
        };
        const playersMap = new Map();
        playersMap.set(hostId, hostPlayer);
        const newRoom = {
            dbId,
            roomCode: roomCode.toUpperCase(),
            hostId,
            players: playersMap,
            status: 'waiting',
            currentRound: 1,
            totalRounds: settings.totalRounds || 3,
            roundDuration: settings.roundDuration || 60,
            maxPlayers: settings.maxPlayers || 8,
            challenges: [],
            timer: settings.roundDuration || 60
        };
        this.rooms.set(newRoom.roomCode, newRoom);
        return newRoom;
    }
    // Fetch an active room
    getRoom(roomCode) {
        return this.rooms.get(roomCode.toUpperCase());
    }
    // Join a player to a room
    joinRoom(roomCode, userId, username, avatar, socketId) {
        const room = this.getRoom(roomCode);
        if (!room)
            return null;
        if (room.status !== 'waiting')
            return null;
        if (room.players.size >= room.maxPlayers)
            return null;
        // Check if player is already in the room
        if (room.players.has(userId)) {
            // Update socket ID on reconnect
            const player = room.players.get(userId);
            player.socketId = socketId;
            return room;
        }
        const newPlayer = {
            userId,
            username,
            avatar,
            socketId,
            ready: false,
            score: 0,
            hasSubmitted: false
        };
        room.players.set(userId, newPlayer);
        return room;
    }
    // Remove a player from a room
    leaveRoom(roomCode, userId) {
        const room = this.getRoom(roomCode);
        if (!room)
            return null;
        room.players.delete(userId);
        // If room is empty, clean it up
        if (room.players.size === 0) {
            this.destroyRoom(room.roomCode);
            return null;
        }
        // If host left, reassign host
        if (room.hostId === userId) {
            const nextHostId = Array.from(room.players.keys())[0];
            room.hostId = nextHostId;
            const hostPlayer = room.players.get(nextHostId);
            if (hostPlayer) {
                hostPlayer.ready = true; // Host must be ready
            }
        }
        return room;
    }
    // Toggle player ready status
    toggleReady(roomCode, userId, readyState) {
        const room = this.getRoom(roomCode);
        if (!room)
            return null;
        const player = room.players.get(userId);
        if (!player)
            return null;
        // Don't change host ready (always ready)
        if (room.hostId === userId) {
            player.ready = true;
        }
        else {
            player.ready = readyState !== undefined ? readyState : !player.ready;
        }
        return room;
    }
    // Check if all players are ready to start
    isEveryoneReady(roomCode) {
        const room = this.getRoom(roomCode);
        if (!room)
            return false;
        return Array.from(room.players.values()).every(p => p.ready);
    }
    // Start the game loop and transition room status
    startGame(roomCode, challenges) {
        const room = this.getRoom(roomCode);
        if (!room || room.players.size === 0)
            return null;
        room.status = 'playing';
        room.currentRound = 1;
        room.challenges = challenges;
        room.timer = room.roundDuration;
        // Reset player round scores
        for (const player of room.players.values()) {
            player.score = 0;
            player.ready = false;
            player.hasSubmitted = false;
            player.lastSubmission = undefined;
        }
        return room;
    }
    // Process a submitted prompt
    submitPrompt(roomCode, userId, submissionData) {
        const room = this.getRoom(roomCode);
        if (!room || room.status !== 'playing')
            return null;
        const player = room.players.get(userId);
        if (!player || player.hasSubmitted)
            return null;
        player.hasSubmitted = true;
        player.lastSubmission = submissionData;
        player.score += submissionData.score; // accumulate score
        return room;
    }
    // Advance round counter and reset round state
    nextRound(roomCode) {
        const room = this.getRoom(roomCode);
        if (!room || room.status !== 'playing')
            return null;
        room.currentRound += 1;
        room.timer = room.roundDuration;
        // Reset submission flags for the new round
        for (const player of room.players.values()) {
            player.hasSubmitted = false;
            player.lastSubmission = undefined;
        }
        return room;
    }
    // End the game
    endGame(roomCode) {
        const room = this.getRoom(roomCode);
        if (!room)
            return null;
        room.status = 'ended';
        this.stopRoomTimer(roomCode);
        return room;
    }
    // Start round timer interval
    startRoomTimer(roomCode, tickCallback, endCallback) {
        const room = this.getRoom(roomCode);
        if (!room)
            return;
        this.stopRoomTimer(roomCode);
        room.timerIntervalId = setInterval(() => {
            const activeRoom = this.getRoom(roomCode);
            if (!activeRoom || activeRoom.status !== 'playing') {
                this.stopRoomTimer(roomCode);
                return;
            }
            activeRoom.timer -= 1;
            // Call the tick update callback
            tickCallback(activeRoom);
            if (activeRoom.timer <= 0) {
                this.stopRoomTimer(roomCode);
                endCallback(activeRoom);
            }
        }, 1000);
    }
    // Stop round timer
    stopRoomTimer(roomCode) {
        const room = this.getRoom(roomCode);
        if (room && room.timerIntervalId) {
            clearInterval(room.timerIntervalId);
            room.timerIntervalId = undefined;
        }
    }
    // Handle a user disconnect event by searching active sockets
    handleDisconnect(socketId) {
        for (const room of this.rooms.values()) {
            for (const player of room.players.values()) {
                if (player.socketId === socketId) {
                    const userId = player.userId;
                    const roomCode = room.roomCode;
                    const updatedState = this.leaveRoom(roomCode, userId);
                    return { roomCode, roomState: updatedState, userId };
                }
            }
        }
        return null;
    }
    // Remove room from active list
    destroyRoom(roomCode) {
        this.stopRoomTimer(roomCode);
        this.rooms.delete(roomCode.toUpperCase());
    }
    // Serialization helper to pass map contents to client easily
    serializeRoom(room) {
        return {
            dbId: room.dbId,
            roomCode: room.roomCode,
            hostId: room.hostId,
            status: room.status,
            currentRound: room.currentRound,
            totalRounds: room.totalRounds,
            roundDuration: room.roundDuration,
            maxPlayers: room.maxPlayers,
            timer: room.timer,
            challengesCount: room.challenges.length,
            currentChallenge: room.challenges[room.currentRound - 1] || null,
            players: Array.from(room.players.values()).map(p => ({
                userId: p.userId,
                username: p.username,
                avatar: p.avatar,
                ready: p.ready,
                score: p.score,
                hasSubmitted: p.hasSubmitted,
                lastSubmission: p.lastSubmission
            }))
        };
    }
}
exports.GameManager = GameManager;
