import {
  ApiErrorSchema,
  EngineeringForecastSchema,
  validateScenarioForecast,
  type ApiErrorCode,
  type EngineeringForecast,
  type ForecastRequest,
} from '@deploy-forecast/shared';

export interface ForecastRequestOptions {
  signal?: AbortSignal;
  fetchImpl?: typeof fetch;
}

export class ForecastApiError extends Error {
  constructor(
    message: string,
    readonly code: ApiErrorCode,
    readonly recoverable: boolean,
    readonly requestId?: string,
  ) {
    super(message);
    this.name = 'ForecastApiError';
  }
}

export async function createForecast(
  input: ForecastRequest,
  options: ForecastRequestOptions = {},
): Promise<EngineeringForecast> {
  const forecast = await requestValidatedApi(
    '/api/forecast',
    input,
    EngineeringForecastSchema,
    'The forecast service returned an unusable response. Please try again.',
    options,
  );
  if (!validateScenarioForecast(forecast, input)) {
    throw new ForecastApiError(
      'The forecast service returned an invalid scenario comparison. Please try again.',
      'INVALID_PROVIDER_RESPONSE',
      true,
    );
  }
  return forecast;
}

interface RuntimeSchema<T> {
  safeParse(value: unknown): { success: true; data: T } | { success: false };
}

export async function requestValidatedApi<T>(
  path: string,
  input: unknown,
  schema: RuntimeSchema<T>,
  invalidResponseMessage: string,
  options: ForecastRequestOptions = {},
): Promise<T> {
  const apiBaseUrl = import.meta.env?.VITE_API_BASE_URL ?? '';
  const fetchImpl = options.fetchImpl ?? fetch;
  let response: Response;
  try {
    response = await fetchImpl(`${apiBaseUrl}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
      signal: options.signal,
    });
  } catch (error) {
    if (options.signal?.aborted) throw error;
    throw new ForecastApiError(
      'Unable to reach the forecast service. Check your connection and try again.',
      'PROVIDER_UNAVAILABLE',
      true,
      undefined,
    );
  }

  const payload: unknown = await response.json().catch(() => undefined);

  if (!response.ok) {
    const apiError = ApiErrorSchema.safeParse(payload);
    if (apiError.success) {
      throw new ForecastApiError(
        apiError.data.error,
        apiError.data.code,
        apiError.data.recoverable,
        apiError.data.requestId,
      );
    }
    throw new ForecastApiError(
      'The forecast service returned an unexpected error. Please try again.',
      'INTERNAL_ERROR',
      true,
      response.headers.get('X-Request-ID') ?? undefined,
    );
  }

  const result = schema.safeParse(payload);
  if (!result.success) {
    throw new ForecastApiError(
      invalidResponseMessage,
      'INVALID_PROVIDER_RESPONSE',
      true,
      response.headers.get('X-Request-ID') ?? undefined,
    );
  }

  return result.data;
}
