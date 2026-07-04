"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Submission = void 0;
const mongoose_1 = require("mongoose");
const SubmissionSchema = new mongoose_1.Schema({
    userId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    roomId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Room',
        default: null
    },
    challengeId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Challenge',
        required: true
    },
    prompt: {
        type: String,
        required: [true, 'Prompt content is required'],
        trim: true
    },
    characters: {
        type: Number,
        required: true
    },
    estimatedTokens: {
        type: Number,
        required: true
    },
    aiResponse: {
        type: String,
        required: true
    },
    similarity: {
        type: Number,
        required: true,
        min: 0,
        max: 100
    },
    score: {
        type: Number,
        required: true
    },
    submittedAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});
// Index submissions for quick retrieval of user's game history and solo records
SubmissionSchema.index({ userId: 1, createdAt: -1 });
SubmissionSchema.index({ roomId: 1 });
exports.Submission = (0, mongoose_1.model)('Submission', SubmissionSchema);
