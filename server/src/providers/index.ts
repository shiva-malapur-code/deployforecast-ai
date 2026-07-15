import { config } from '../config.js';
import type { AIProvider } from './ai-provider.js';
import { MockProvider } from './mock-provider.js';
import { OllamaProvider } from './ollama-provider.js';

export function createAIProvider(): AIProvider {
  return config.AI_PROVIDER === 'ollama' ? new OllamaProvider() : new MockProvider();
}
