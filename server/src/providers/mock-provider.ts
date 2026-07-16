import { createDemoForecast, type ForecastRequest } from '@deploy-forecast/shared';
import type { AIProvider } from './ai-provider.js';
import { parseProviderForecast } from './provider-output.js';

export class MockProvider implements AIProvider {
  readonly name = 'mock';

  async forecast(input: ForecastRequest) {
    await new Promise((resolve) => setTimeout(resolve, 700));
    return parseProviderForecast(createDemoForecast(input, this.name), this.name);
  }
}
