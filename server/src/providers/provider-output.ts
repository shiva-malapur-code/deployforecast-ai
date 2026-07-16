import { EngineeringForecastSchema, type EngineeringForecast } from '@deploy-forecast/shared';

export class ProviderOutputError extends Error {
  readonly provider: string;

  constructor(provider: string, options?: ErrorOptions) {
    super('AI provider returned an invalid forecast.', options);
    this.name = 'ProviderOutputError';
    this.provider = provider;
  }
}

export function parseProviderForecast(value: unknown, provider: string): EngineeringForecast {
  const result = EngineeringForecastSchema.safeParse(value);
  if (!result.success) {
    throw new ProviderOutputError(provider, { cause: result.error });
  }
  return result.data;
}
