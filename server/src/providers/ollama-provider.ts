import type { ForecastRequest } from '@deploy-forecast/shared';
import { z } from 'zod';
import { config } from '../config.js';
import { ProviderUnavailableError, type AIProvider } from './ai-provider.js';
import { parseProviderForecast, ProviderOutputError } from './provider-output.js';

const ollamaResponseSchema = z.object({ response: z.string() });

export class OllamaProvider implements AIProvider {
  readonly name = `ollama:${config.OLLAMA_MODEL}`;

  constructor(private readonly fetchImpl: typeof fetch = fetch) {}

  async forecast(input: ForecastRequest, signal?: AbortSignal) {
    let response: Response;
    try {
      response = await this.fetchImpl(`${config.OLLAMA_BASE_URL}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: config.OLLAMA_MODEL,
          stream: false,
          format: 'json',
          prompt: this.buildPrompt(input),
        }),
        signal,
      });
    } catch (error) {
      if (signal?.aborted) throw error;
      throw new ProviderUnavailableError({ cause: error });
    }

    if (!response.ok) {
      throw new ProviderUnavailableError();
    }

    let payload: z.infer<typeof ollamaResponseSchema>;
    try {
      payload = ollamaResponseSchema.parse(await response.json());
    } catch (error) {
      throw new ProviderOutputError(this.name, { cause: error });
    }

    let decoded: unknown;
    try {
      decoded = JSON.parse(payload.response);
    } catch (error) {
      throw new ProviderOutputError(this.name, { cause: error });
    }

    const forecast =
      typeof decoded === 'object' && decoded !== null
        ? { ...decoded, provider: this.name, generatedAt: new Date().toISOString() }
        : decoded;

    return parseProviderForecast(forecast, this.name);
  }

  private buildPrompt(input: ForecastRequest): string {
    return `You are a senior React reliability engineer. Analyze observable code signals and return one JSON object matching the EngineeringForecast contract. Describe plausible risks using calibrated words such as may or could. Never invent measured probabilities, traffic, revenue, Lighthouse scores, or bundle sizes. Include stable ids, integer health, reliability, performance, accessibility, security, and maintainability scores from 0-100, and a clear disclaimer.\n\nScenario: ${input.scenario ?? 'Standard production deployment'}\n\nCode:\n${input.code}`;
  }
}
