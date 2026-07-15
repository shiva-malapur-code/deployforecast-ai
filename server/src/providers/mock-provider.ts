import {
  createDemoForecast,
  type EngineeringForecast,
  type ForecastRequest,
} from '@deploy-forecast/shared';
import type { AIProvider } from './ai-provider.js';

export class MockProvider implements AIProvider {
  readonly name = 'mock';

  async forecast(input: ForecastRequest): Promise<EngineeringForecast> {
    await new Promise((resolve) => setTimeout(resolve, 700));
    return createDemoForecast(input, this.name);
  }
}
