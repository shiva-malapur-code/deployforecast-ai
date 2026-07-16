import {
  ApiErrorSchema,
  EngineeringForecastSchema,
  type EngineeringForecast,
  type ForecastRequest,
} from '@deploy-forecast/shared';

export async function createForecast(input: ForecastRequest): Promise<EngineeringForecast> {
  const apiBaseUrl = import.meta.env?.VITE_API_BASE_URL ?? '';
  const response = await fetch(`${apiBaseUrl}/api/forecast`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });

  const payload: unknown = await response.json().catch(() => undefined);

  if (!response.ok) {
    const apiError = ApiErrorSchema.safeParse(payload);
    throw new Error(apiError.success ? apiError.data.error : 'Unable to generate the forecast.');
  }

  const forecast = EngineeringForecastSchema.safeParse(payload);
  if (!forecast.success) {
    throw new Error('Forecast API returned an invalid response.');
  }

  return forecast.data;
}
