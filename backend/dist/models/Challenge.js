"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Challenge = void 0;
const mongoose_1 = require("mongoose");
const ChallengeSchema = new mongoose_1.Schema({
    targetOutput: {
        type: String,
        required: [true, 'Target output is required'],
        trim: true
    },
    difficulty: {
        type: String,
        enum: ['easy', 'medium', 'hard'],
        default: 'medium'
    },
    category: {
        type: String,
        required: [true, 'Category is required'],
        default: 'general',
        trim: true
    },
    createdBy: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        default: null
    }
}, {
    timestamps: true
});
exports.Challenge = (0, mongoose_1.model)('Challenge', ChallengeSchema);
