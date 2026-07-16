import type {
  EngineeringForecast,
  ForecastRequest,
  GeneratedTests,
  GeneratedTestsRequest,
  PreventiveFix,
  PreventiveFixRequest,
} from '@deploy-forecast/shared';

export interface AIProvider {
  readonly name: string;
  forecast(input: ForecastRequest, signal?: AbortSignal): Promise<EngineeringForecast>;
  generatePreventiveFix(input: PreventiveFixRequest, signal?: AbortSignal): Promise<PreventiveFix>;
  generateTests(input: GeneratedTestsRequest, signal?: AbortSignal): Promise<GeneratedTests>;
}

export class ProviderUnavailableError extends Error {
  constructor(options?: ErrorOptions) {
    super('Forecast provider unavailable.', options);
    this.name = 'ProviderUnavailableError';
  }
}
