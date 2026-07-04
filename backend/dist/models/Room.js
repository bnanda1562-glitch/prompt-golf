"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Room = void 0;
const mongoose_1 = require("mongoose");
const RoomPlayerSchema = new mongoose_1.Schema({
    user: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    username: {
        type: String,
        required: true
    },
    avatar: {
        type: String,
        default: ''
    },
    socketId: {
        type: String,
        required: true
    },
    ready: {
        type: Boolean,
        default: false
    },
    score: {
        type: Number,
        default: 0
    },
    joinedAt: {
        type: Date,
        default: Date.now
    }
}, { _id: false });
const RoomSchema = new mongoose_1.Schema({
    roomCode: {
        type: String,
        required: true,
        unique: true,
        uppercase: true,
        trim: true,
        minlength: 4,
        maxlength: 6
    },
    host: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    players: [RoomPlayerSchema],
    status: {
        type: String,
        enum: ['waiting', 'playing', 'ended'],
        default: 'waiting'
    },
    currentRound: {
        type: Number,
        default: 1
    },
    totalRounds: {
        type: Number,
        default: 3
    },
    roundDuration: {
        type: Number,
        default: 60 // 60 seconds
    },
    maxPlayers: {
        type: Number,
        default: 8
    },
    challenges: [{
            type: mongoose_1.Schema.Types.ObjectId,
            ref: 'Challenge'
        }]
}, {
    timestamps: true
});
exports.Room = (0, mongoose_1.model)('Room', RoomSchema);
