import { Anthropic } from '@anthropic-ai/sdk';
import { OpenAI } from 'openai';
import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';

dotenv.config();

export interface IAIService {
  generateResponse(prompt: string): Promise<string>;
  estimateTokens(prompt: string): number;
}

// 1. Mock AI Service for local testing without API Keys
export class MockAIService implements IAIService {
  async generateResponse(prompt: string): Promise<string> {
    console.log(`[MockAI] Generating response for prompt: "${prompt}"`);
    // Heuristics to make local mock feel interactive and winnable for default challenges
    const lowercasePrompt = prompt.toLowerCase();
    
    if (lowercasePrompt.includes('france') || lowercasePrompt.includes('paris') || lowercasePrompt.includes('capital')) {
      return 'The capital of France is Paris.';
    }
    if (lowercasePrompt.includes('hello') || lowercasePrompt.includes('hi') || lowercasePrompt.includes('today') || lowercasePrompt.includes('help you')) {
      return 'Hello! How can I help you today?';
    }
    if (lowercasePrompt.includes('fox') || lowercasePrompt.includes('dog') || lowercasePrompt.includes('lazy') || lowercasePrompt.includes('quick brown')) {
      return 'The quick brown fox jumps over the lazy dog.';
    }
    if (lowercasePrompt.includes('binary') || lowercasePrompt.includes(' 5 ') || lowercasePrompt.includes('101') || lowercasePrompt.includes('representation')) {
      return 'The binary representation of number 5 is 101.';
    }
    if (lowercasePrompt.includes('to be') || lowercasePrompt.includes('question') || lowercasePrompt.includes('shakespeare') || lowercasePrompt.includes('soliloquy')) {
      return 'To be, or not to be, that is the question.';
    }
    if (lowercasePrompt.includes('typescript') || lowercasePrompt.includes('superset') || lowercasePrompt.includes('javascript') || lowercasePrompt.includes('typed')) {
      return 'TypeScript is a typed superset of JavaScript that compiles to plain JavaScript.';
    }
    
    return `Mock response to: ${prompt}`;
  }

  estimateTokens(prompt: string): number {
    // Standard rule of thumb: ~4 characters per token
    return Math.ceil(prompt.trim().length / 4);
  }
}

// 2. Anthropic (Claude) AI Service
export class AnthropicAIService implements IAIService {
  private client: Anthropic;

  constructor() {
    this.client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY || ''
    });
  }

  async generateResponse(prompt: string): Promise<string> {
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
    } catch (error) {
      console.error('Anthropic API error:', error);
      throw new Error('Failed to generate response from Anthropic');
    }
  }

  estimateTokens(prompt: string): number {
    return Math.ceil(prompt.trim().length / 4);
  }
}

// 3. OpenAI AI Service
export class OpenAIService implements IAIService {
  private client: OpenAI;

  constructor() {
    this.client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY || ''
    });
  }

  async generateResponse(prompt: string): Promise<string> {
    try {
      const completion = await this.client.chat.completions.create({
        model: 'gpt-4o-mini', // fast, cost-effective
        max_tokens: 150,
        messages: [{ role: 'user', content: prompt }]
      });
      return completion.choices[0]?.message?.content?.trim() || '';
    } catch (error) {
      console.error('OpenAI API error:', error);
      throw new Error('Failed to generate response from OpenAI');
    }
  }

  estimateTokens(prompt: string): number {
    return Math.ceil(prompt.trim().length / 4);
  }
}

// 4. Google (Gemini) AI Service
export class GeminiAIService implements IAIService {
  private ai: GoogleGenerativeAI;

  constructor() {
    this.ai = new GoogleGenerativeAI(
      process.env.GEMINI_API_KEY || ''
    );
  }

  async generateResponse(prompt: string): Promise<string> {
    try {
      // Use gemini-1.5-flash for rapid completion
      const model = this.ai.getGenerativeModel({ model: 'gemini-1.5-flash' });
      const result = await model.generateContent(prompt);
      return result.response.text().trim();
    } catch (error) {
      console.error('Gemini API error:', error);
      throw new Error('Failed to generate response from Gemini');
    }
  }

  estimateTokens(prompt: string): number {
    return Math.ceil(prompt.trim().length / 4);
  }
}

// Factory to fetch the correct service depending on the .env config
export class AIServiceFactory {
  static getService(): IAIService {
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
