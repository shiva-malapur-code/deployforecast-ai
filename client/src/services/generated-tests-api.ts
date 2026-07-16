import {
  GeneratedTestsSchema,
  validateGeneratedTestEvidence,
  type GeneratedTests,
  type GeneratedTestsRequest,
} from '@deploy-forecast/shared';
import {
  ForecastApiError,
  requestValidatedApi,
  type ForecastRequestOptions,
} from '@/services/forecast-api';

export async function createGeneratedTests(
  input: GeneratedTestsRequest,
  options: ForecastRequestOptions = {},
): Promise<GeneratedTests> {
  const tests = await requestValidatedApi(
    '/api/generated-tests',
    input,
    GeneratedTestsSchema,
    'The generated-tests service returned an unusable response. Please try again.',
    options,
  );
  if (!validateGeneratedTestEvidence(tests, input)) {
    throw new ForecastApiError(
      'The generated-tests service returned unsupported strategies. Please try again.',
      'INVALID_PROVIDER_RESPONSE',
      true,
    );
  }
  return tests;
}
