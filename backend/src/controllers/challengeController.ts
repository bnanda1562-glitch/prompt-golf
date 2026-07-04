import { Response } from 'express';
import { Challenge } from '../models/Challenge.js';
import { AuthRequest } from '../middleware/auth.js';
import { AIServiceFactory } from '../services/AIService.js';
import { SimilarityService } from '../services/SimilarityService.js';
import { Submission } from '../models/Submission.js';
import { User } from '../models/User.js';

// 1. Get all challenges (optionally filter by difficulty or category)
export const getChallenges = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { difficulty, category } = req.query;
    const filter: any = {};

    if (difficulty) filter.difficulty = difficulty;
    if (category) filter.category = category;

    const challenges = await Challenge.find(filter).sort({ createdAt: -1 });
    res.json(challenges);
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Server error fetching challenges' });
  }
};

// 2. Get challenge by ID
export const getChallengeById = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const challenge = await Challenge.findById(req.params.id);
    if (!challenge) {
      res.status(404).json({ message: 'Challenge not found' });
      return;
    }
    res.json(challenge);
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Server error fetching challenge' });
  }
};

// 3. Create a challenge
export const createChallenge = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { targetOutput, difficulty, category } = req.body;

    if (!targetOutput || !category) {
      res.status(400).json({ message: 'targetOutput and category are required' });
      return;
    }

    const createdBy = req.user?.id || null;

    const challenge = await Challenge.create({
      targetOutput,
      difficulty: difficulty || 'medium',
      category,
      createdBy
    });

    res.status(201).json(challenge);
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Server error creating challenge' });
  }
};

// 4. Delete a challenge
export const deleteChallenge = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const challenge = await Challenge.findById(req.params.id);

    if (!challenge) {
      res.status(404).json({ message: 'Challenge not found' });
      return;
    }

    // Only creator or admin can delete
    if (req.user?.role !== 'admin' && challenge.createdBy?.toString() !== req.user?.id) {
      res.status(403).json({ message: 'Not authorized to delete this challenge' });
      return;
    }

    await challenge.deleteOne();
    res.json({ message: 'Challenge removed successfully' });
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Server error deleting challenge' });
  }
};

// 5. Get random challenges for game creation (Internal socket helper / API route)
export const getRandomChallenges = async (count: number = 3): Promise<any[]> => {
  try {
    // MongoDB aggregation to sample random documents
    const challenges = await Challenge.aggregate([
      { $sample: { size: count } }
    ]);
    return challenges;
  } catch (error) {
    console.error('Error fetching random challenges:', error);
    return [];
  }
};

// 6. Evaluate a Solo Play Prompt submission via REST endpoint
export const evaluateSoloPrompt = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { challengeId, prompt, timeRemaining } = req.body;

    if (!challengeId || !prompt) {
      res.status(400).json({ message: 'challengeId and prompt are required' });
      return;
    }

    const challenge = await Challenge.findById(challengeId);
    if (!challenge) {
      res.status(404).json({ message: 'Challenge not found' });
      return;
    }

    // Call swappable AI Service to generate response and estimate tokens
    const aiService = AIServiceFactory.getService();
    const aiResponse = await aiService.generateResponse(prompt);
    const estimatedTokens = aiService.estimateTokens(prompt);
    const characters = prompt.length;

    // Evaluate Similarity and Score
    const similarity = SimilarityService.calculateSimilarity(challenge.targetOutput, aiResponse);
    const score = SimilarityService.calculateScore(similarity, characters, timeRemaining || 60);

    // Save to Database
    const submission = await Submission.create({
      userId: req.user?.id,
      roomId: null, // Solo has no room ID
      challengeId,
      prompt,
      characters,
      estimatedTokens,
      aiResponse,
      similarity,
      score
    });

    // Update ELO rating and statistics for user on database
    await User.findByIdAndUpdate(req.user?.id, {
      $inc: {
        gamesPlayed: 1,
        wins: similarity >= 85 ? 1 : 0, // Mark a win if accuracy is 85% or above
        rating: similarity >= 85 ? 15 : -5 // ELO rating change
      }
    });

    res.json({
      prompt,
      characters,
      estimatedTokens,
      aiResponse,
      similarity,
      score,
      submittedAt: submission.submittedAt
    });
  } catch (error: any) {
    console.error('Solo prompt evaluation error:', error);
    res.status(500).json({ message: error.message || 'Prompt evaluation failed' });
  }
};

