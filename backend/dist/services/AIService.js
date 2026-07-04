"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AIServiceFactory = exports.GeminiAIService = exports.OpenAIService = exports.AnthropicAIService = exports.MockAIService = void 0;
const sdk_1 = require("@anthropic-ai/sdk");
const openai_1 = require("openai");
const generative_ai_1 = require("@google/generative-ai");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
// 1. Mock AI Service for local testing without API Keys
class MockAIService {
    async generateResponse(prompt) {
        console.log(`[MockAI] Generating response for prompt: "${prompt}"`);
        // Basic heuristics to make mock feel a bit interactive
        const lowercasePrompt = prompt.toLowerCase();
        if (lowercasePrompt.includes('france') || lowercasePrompt.includes('paris')) {
            return 'The capital of France is Paris.';
        }
        if (lowercasePrompt.includes('hello') || lowercasePrompt.includes('hi')) {
            return 'Hello! How can I help you today?';
        }
        return `Mock response to: ${prompt}`;
    }
    estimateTokens(prompt) {
        // Standard rule of thumb: ~4 characters per token
        return Math.ceil(prompt.trim().length / 4);
    }
}
exports.MockAIService = MockAIService;
// 2. Anthropic (Claude) AI Service
class AnthropicAIService {
    client;
    constructor() {
        this.client = new sdk_1.Anthropic({
            apiKey: process.env.ANTHROPIC_API_KEY || ''
        });
    }
    async generateResponse(prompt) {
        try {
            const response = await this.client.messages.create({
                model: 'claude-3-haiku-20240307', // fast, cheap model ideal for prompt-golf round-timers
                max_tokens: 150,
                messages: [{ role: 'user', content: prompt }]
            });
            const textBlock = response.content[0];
            if (textBlock.type === 'text') {
                return textBlock.text.trim();
            }
            return '';
        }
        catch (error) {
            console.error('Anthropic API error:', error);
            throw new Error('Failed to generate response from Anthropic');
        }
    }
    estimateTokens(prompt) {
        return Math.ceil(prompt.trim().length / 4);
    }
}
exports.AnthropicAIService = AnthropicAIService;
// 3. OpenAI AI Service
class OpenAIService {
    client;
    constructor() {
        this.client = new openai_1.OpenAI({
            apiKey: process.env.OPENAI_API_KEY || ''
        });
    }
    async generateResponse(prompt) {
        try {
            const completion = await this.client.chat.completions.create({
                model: 'gpt-4o-mini', // fast, cost-effective
                max_tokens: 150,
                messages: [{ role: 'user', content: prompt }]
            });
            return completion.choices[0]?.message?.content?.trim() || '';
        }
        catch (error) {
            console.error('OpenAI API error:', error);
            throw new Error('Failed to generate response from OpenAI');
        }
    }
    estimateTokens(prompt) {
        return Math.ceil(prompt.trim().length / 4);
    }
}
exports.OpenAIService = OpenAIService;
// 4. Google (Gemini) AI Service
class GeminiAIService {
    ai;
    constructor() {
        this.ai = new generative_ai_1.GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
    }
    async generateResponse(prompt) {
        try {
            // Use gemini-1.5-flash for rapid completion
            const model = this.ai.getGenerativeModel({ model: 'gemini-1.5-flash' });
            const result = await model.generateContent(prompt);
            return result.response.text().trim();
        }
        catch (error) {
            console.error('Gemini API error:', error);
            throw new Error('Failed to generate response from Gemini');
        }
    }
    estimateTokens(prompt) {
        return Math.ceil(prompt.trim().length / 4);
    }
}
exports.GeminiAIService = GeminiAIService;
// Factory to fetch the correct service depending on the .env config
class AIServiceFactory {
    static getService() {
        const provider = (process.env.AI_PROVIDER || 'mock').toLowerCase();
        switch (provider) {
            case 'anthropic':
                return new AnthropicAIService();
            case 'openai':
                return new OpenAIService();
            case 'gemini':
                return new GeminiAIService();
            case 'mock':
            default:
                return new MockAIService();
        }
    }
}
exports.AIServiceFactory = AIServiceFactory;
