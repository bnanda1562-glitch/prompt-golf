import { Schema, model, Document, Types } from 'mongoose';

export interface ISubmission extends Document {
  userId: Types.ObjectId;
  roomId: Types.ObjectId | null; // null for Play Solo mode
  challengeId: Types.ObjectId;
  prompt: string;
  characters: number;
  estimatedTokens: number;
  aiResponse: string;
  similarity: number; // Semantic similarity (0 to 100)
  score: number;
  submittedAt: Date;
}

const SubmissionSchema = new Schema<ISubmission>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  roomId: {
    type: Schema.Types.ObjectId,
    ref: 'Room',
    default: null
  },
  challengeId: {
    type: Schema.Types.ObjectId,
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

export const Submission = model<ISubmission>('Submission', SubmissionSchema);
