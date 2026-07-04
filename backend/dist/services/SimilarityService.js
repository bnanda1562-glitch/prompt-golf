"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SimilarityService = void 0;
const natural_1 = __importDefault(require("natural"));
class SimilarityService {
    /**
     * Tokenizes, cleans, and computes TF-IDF Cosine Similarity of two strings.
     * Leverages Jaro-Winkler distance as a sub-metric to account for slight spelling errors or typos.
     */
    static calculateSimilarity(target, response) {
        const cleanTarget = target.trim().toLowerCase();
        const cleanResponse = response.trim().toLowerCase();
        if (!cleanTarget || !cleanResponse)
            return 0;
        if (cleanTarget === cleanResponse)
            return 100;
        // 1. Vector Space Model (Cosine Similarity)
        const targetTokens = this.tokenize(cleanTarget);
        const responseTokens = this.tokenize(cleanResponse);
        const cosineSimilarity = this.cosineSimilarity(targetTokens, responseTokens);
        // 2. String Edit Distance (Jaro-Winkler for typo tolerance)
        const jaroWinkler = natural_1.default.JaroWinklerDistance(cleanTarget, cleanResponse, { ignoreCase: true });
        // Combine Cosine Similarity (semantic/term overlap) and Jaro-Winkler (character/sequence match)
        // 70% weight to Term Overlap, 30% weight to String Edit Distance
        const combined = (cosineSimilarity * 0.7) + (jaroWinkler * 0.3);
        // Convert to percentage (0 - 100) and round to 2 decimal places
        const percentage = Math.min(100, Math.max(0, combined * 100));
        return Math.round(percentage * 100) / 100;
    }
    /**
     * Calculates the Prompt Golf score.
     * Scoring factors:
     * - Similarity: 0 to 100% (Weight: 80% -> 800 max points)
     * - Characters: Shorter is better (Weight: 10% -> 100 max points, drops as character count grows)
     * - Time Remaining: Faster is better (Weight: 10% -> 100 max points)
     */
    static calculateScore(similarity, characters, timeRemaining, totalTime = 60) {
        // If the output is not semantically matching (below 35% threshold), score is 0
        if (similarity < 35) {
            return 0;
        }
        // 1. Similarity Points: up to 800 points
        const similarityPoints = (similarity / 100) * 800;
        // 2. Length Bonus: up to 100 points
        // Optimal prompt is very short. Let's reward prompts under 100 chars, decrementing down to 0 at 150 chars.
        const lengthPoints = Math.max(0, 100 * (1 - characters / 150));
        // 3. Time Bonus: up to 100 points
        // Faster submission rewards more points
        const timeRatio = totalTime > 0 ? Math.max(0, Math.min(1, timeRemaining / totalTime)) : 0;
        const timePoints = timeRatio * 100;
        // Total final score (1000 max points)
        const finalScore = Math.round(similarityPoints + lengthPoints + timePoints);
        return Math.min(1000, Math.max(0, finalScore));
    }
    /**
     * Helper to tokenize and clean strings.
     */
    static tokenize(text) {
        // Remove punctuation, split by spaces, filter empty values
        return text
            .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?"']/g, '')
            .split(/\s+/)
            .filter(token => token.length > 0);
    }
    /**
     * Helper to compute cosine similarity between two token lists.
     */
    static cosineSimilarity(vecA, vecB) {
        const freqA = this.getTermFrequencies(vecA);
        const freqB = this.getTermFrequencies(vecB);
        const allTerms = new Set([...Object.keys(freqA), ...Object.keys(freqB)]);
        let dotProduct = 0;
        let sumSqA = 0;
        let sumSqB = 0;
        for (const term of allTerms) {
            const valA = freqA[term] || 0;
            const valB = freqB[term] || 0;
            dotProduct += valA * valB;
            sumSqA += valA * valA;
            sumSqB += valB * valB;
        }
        const magnitude = Math.sqrt(sumSqA) * Math.sqrt(sumSqB);
        return magnitude === 0 ? 0 : dotProduct / magnitude;
    }
    static getTermFrequencies(tokens) {
        const freqs = {};
        for (const token of tokens) {
            freqs[token] = (freqs[token] || 0) + 1;
        }
        return freqs;
    }
}
exports.SimilarityService = SimilarityService;
