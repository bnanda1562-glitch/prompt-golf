import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { Challenge } from '../models/Challenge.js';
import { MongoMemoryServer } from 'mongodb-memory-server';

dotenv.config();

let mongoServer: MongoMemoryServer | null = null;

export const connectDB = async (): Promise<void> => {
  try {
    let uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/prompt-golf';
    
    console.log('Connecting to MongoDB...');
    
    try {
      // Attempt connection with a short 2-second timeout
      await mongoose.connect(uri, { serverSelectionTimeoutMS: 2000 });
      console.log(`MongoDB Connected successfully to ${uri}`);
    } catch (err) {
      console.warn('Could not connect to MongoDB service on port 27017. Spinning up local MongoMemoryServer fallback...');
      mongoServer = await MongoMemoryServer.create();
      uri = mongoServer.getUri();
      await mongoose.connect(uri);
      console.log(`Local In-memory MongoDB Connected successfully: ${uri}`);
    }

    // Seed default challenges if none exist
    const challengeCount = await Challenge.countDocuments();
    if (challengeCount === 0) {
      console.log('No challenges found. Seeding default Prompt Golf challenges...');
      const defaultChallenges = [
        {
          targetOutput: 'The capital of France is Paris.',
          difficulty: 'easy',
          category: 'geography',
          createdBy: null
        },
        {
          targetOutput: 'Hello! How can I help you today?',
          difficulty: 'easy',
          category: 'conversation',
          createdBy: null
        },
        {
          targetOutput: 'The quick brown fox jumps over the lazy dog.',
          difficulty: 'medium',
          category: 'typing',
          createdBy: null
        },
        {
          targetOutput: 'The binary representation of number 5 is 101.',
          difficulty: 'medium',
          category: 'computing',
          createdBy: null
        },
        {
          targetOutput: 'To be, or not to be, that is the question.',
          difficulty: 'hard',
          category: 'literature',
          createdBy: null
        },
        {
          targetOutput: 'TypeScript is a typed superset of JavaScript that compiles to plain JavaScript.',
          difficulty: 'hard',
          category: 'programming',
          createdBy: null
        }
      ];

      await Challenge.insertMany(defaultChallenges);
      console.log('Successfully seeded default challenges!');
    }
  } catch (error) {
    console.error(`Error connecting to MongoDB: ${error instanceof Error ? error.message : error}`);
    process.exit(1);
  }
};
