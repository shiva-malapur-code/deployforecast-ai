import {
  PreventiveFixSchema,
  validatePreventiveFixEvidence,
  type PreventiveFix,
  type PreventiveFixRequest,
} from '@deploy-forecast/shared';
import {
  ForecastApiError,
  requestValidatedApi,
  type ForecastRequestOptions,
} from '@/services/forecast-api';

export function createPreventiveFix(
  input: PreventiveFixRequest,
  options: ForecastRequestOptions = {},
): Promise<PreventiveFix> {
  return requestPreventiveFix(input, options);
}

async function requestPreventiveFix(
  input: PreventiveFixRequest,
  options: ForecastRequestOptions,
): Promise<PreventiveFix> {
  const fix = await requestValidatedApi(
    '/api/preventive-fix',
    input,
    PreventiveFixSchema,
    'The preventive-fix service returned an unusable response. Please try again.',
    options,
  );
  if (!validatePreventiveFixEvidence(fix, input)) {
    throw new ForecastApiError(
      'The preventive-fix service returned unsupported changes. Please try again.',
      'INVALID_PROVIDER_RESPONSE',
      true,
    );
  }
  return fix;
}
