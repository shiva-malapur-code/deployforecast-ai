import type {
  EngineeringForecast,
  ForecastRequest,
  PreventiveFix,
  PreventiveFixRequest,
} from '@deploy-forecast/shared';

export interface AIProvider {
  readonly name: string;
  forecast(input: ForecastRequest, signal?: AbortSignal): Promise<EngineeringForecast>;
  generatePreventiveFix(input: PreventiveFixRequest, signal?: AbortSignal): Promise<PreventiveFix>;
}

export class ProviderUnavailableError extends Error {
  constructor(options?: ErrorOptions) {
    super('Forecast provider unavailable.', options);
    this.name = 'ProviderUnavailableError';
  }
}
