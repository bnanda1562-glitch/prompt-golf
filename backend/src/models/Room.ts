import { Schema, model, Document, Types } from 'mongoose';

export interface IRoomPlayer {
  user: Types.ObjectId;
  username: string;
  avatar?: string;
  socketId: string;
  ready: boolean;
  score: number;
  joinedAt: Date;
}

export interface IRoom extends Document {
  roomCode: string;
  host: Types.ObjectId;
  players: IRoomPlayer[];
  status: 'waiting' | 'playing' | 'ended';
  currentRound: number;
  totalRounds: number;
  roundDuration: number; // in seconds
  maxPlayers: number;
  challenges: Types.ObjectId[]; // List of challenges picked for the match
  createdAt: Date;
  updatedAt: Date;
}

const RoomPlayerSchema = new Schema<IRoomPlayer>({
  user: {
    type: Schema.Types.ObjectId,
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

const RoomSchema = new Schema<IRoom>({
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
    type: Schema.Types.ObjectId,
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
    type: Schema.Types.ObjectId,
    ref: 'Challenge'
  }]
}, {
  timestamps: true
});

export const Room = model<IRoom>('Room', RoomSchema);
