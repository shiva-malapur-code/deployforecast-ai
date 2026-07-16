import {
  EngineeringForecastSchema,
  GeneratedTestsSchema,
  PreventiveFixSchema,
  validateGeneratedTestEvidence,
  validatePreventiveFixEvidence,
  type EngineeringForecast,
  type GeneratedTests,
  type GeneratedTestsRequest,
  type PreventiveFix,
  type PreventiveFixRequest,
} from '@deploy-forecast/shared';

export class ProviderOutputError extends Error {
  readonly provider: string;

  constructor(provider: string, options?: ErrorOptions) {
    super('AI provider returned an invalid response.', options);
    this.name = 'ProviderOutputError';
    this.provider = provider;
  }
}

export function parseProviderPreventiveFix(
  value: unknown,
  provider: string,
  input: PreventiveFixRequest,
): PreventiveFix {
  const result = PreventiveFixSchema.safeParse(value);
  if (!result.success || !validatePreventiveFixEvidence(result.data, input)) {
    throw new ProviderOutputError(provider, { cause: result.success ? undefined : result.error });
  }
  return result.data;
}

export function parseProviderForecast(value: unknown, provider: string): EngineeringForecast {
  const result = EngineeringForecastSchema.safeParse(value);
  if (!result.success) {
    throw new ProviderOutputError(provider, { cause: result.error });
  }
  return result.data;
}

export function parseProviderGeneratedTests(
  value: unknown,
  provider: string,
  input: GeneratedTestsRequest,
): GeneratedTests {
  const result = GeneratedTestsSchema.safeParse(value);
  if (!result.success || !validateGeneratedTestEvidence(result.data, input)) {
    throw new ProviderOutputError(provider, { cause: result.success ? undefined : result.error });
  }
  return result.data;
}
