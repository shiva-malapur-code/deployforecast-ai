import type { ForecastRequest, PreventiveFixRequest } from '@deploy-forecast/shared';
import { z } from 'zod';
import { config } from '../config.js';
import { ProviderUnavailableError, type AIProvider } from './ai-provider.js';
import {
  parseProviderForecast,
  parseProviderPreventiveFix,
  ProviderOutputError,
} from './provider-output.js';

const ollamaResponseSchema = z.object({ response: z.string() });

export class OllamaProvider implements AIProvider {
  readonly name = `ollama:${config.OLLAMA_MODEL}`;

  constructor(private readonly fetchImpl: typeof fetch = fetch) {}

  async forecast(input: ForecastRequest, signal?: AbortSignal) {
    const decoded = await this.generateJson(this.buildForecastPrompt(input), signal);
    const forecast =
      typeof decoded === 'object' && decoded !== null
        ? { ...decoded, provider: this.name, generatedAt: new Date().toISOString() }
        : decoded;

    return parseProviderForecast(forecast, this.name);
  }

  async generatePreventiveFix(input: PreventiveFixRequest, signal?: AbortSignal) {
    const decoded = await this.generateJson(this.buildPreventiveFixPrompt(input), signal);
    const fix =
      typeof decoded === 'object' && decoded !== null
        ? { ...decoded, provider: this.name, generatedAt: new Date().toISOString() }
        : decoded;

    return parseProviderPreventiveFix(fix, this.name, input);
  }

  private async generateJson(prompt: string, signal?: AbortSignal): Promise<unknown> {
    let response: Response;
    try {
      response = await this.fetchImpl(`${config.OLLAMA_BASE_URL}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: config.OLLAMA_MODEL,
          stream: false,
          format: 'json',
          prompt,
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

    return decoded;
  }

  private buildForecastPrompt(input: ForecastRequest): string {
    return `You are a senior React reliability engineer. Analyze observable code signals and return one JSON object matching the EngineeringForecast contract. Describe plausible risks using calibrated words such as may or could. Never invent measured probabilities, traffic, revenue, Lighthouse scores, or bundle sizes. Include stable ids, integer health, reliability, performance, accessibility, security, and maintainability scores from 0-100, and a clear disclaimer.\n\nScenario: ${input.scenario ?? 'Standard production deployment'}\n\nCode:\n${input.code}`;
  }

  private buildPreventiveFixPrompt(input: PreventiveFixRequest): string {
    const evidence = JSON.stringify({
      signals: input.forecast.signals,
      risks: input.forecast.risks,
    });
    return `You are a senior React engineer generating one preventive code fix. Return valid JSON only with: id, originalCode, improvedCode, summary, changes, and reviewWarning. Each changes item must contain riskId, signalIds, title, and explanation. Preserve current application behavior. Copy originalCode exactly. Fix only issues directly supported by the supplied forecast evidence. Every change must reference an existing riskId and its signalIds. Avoid unrelated cleanup, unnecessary abstractions, generated tests, and unsupported performance claims. Return the complete improved source, not a patch.\n\nLanguage: ${input.language}\n\nForecast evidence:\n${evidence}\n\nOriginal code:\n${input.code}`;
  }
}
