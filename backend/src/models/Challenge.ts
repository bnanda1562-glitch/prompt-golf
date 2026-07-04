import { Schema, model, Document, Types } from 'mongoose';

export interface IChallenge extends Document {
  targetOutput: string;
  difficulty: 'easy' | 'medium' | 'hard';
  category: string;
  createdBy: Types.ObjectId | null; // null represents system default
  createdAt: Date;
  updatedAt: Date;
}

const ChallengeSchema = new Schema<IChallenge>({
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
    type: Schema.Types.ObjectId,
    ref: 'User',
    default: null
  }
}, {
  timestamps: true
});

export const Challenge = model<IChallenge>('Challenge', ChallengeSchema);
