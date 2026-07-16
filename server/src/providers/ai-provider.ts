import type { EngineeringForecast, ForecastRequest } from '@deploy-forecast/shared';

export interface AIProvider {
  readonly name: string;
  forecast(input: ForecastRequest, signal?: AbortSignal): Promise<EngineeringForecast>;
}

export class ProviderUnavailableError extends Error {
  constructor(options?: ErrorOptions) {
    super('Forecast provider unavailable.', options);
    this.name = 'ProviderUnavailableError';
  }
}
