import type { EngineeringForecast, ForecastRequest } from '@deploy-forecast/shared';
import { createForecast } from '@/services/forecast-api';

export interface ForecastSubmission {
  forecast: EngineeringForecast;
  request: Readonly<ForecastRequest>;
}

export type ForecastRequester = (
  request: ForecastRequest,
  options?: { signal?: AbortSignal },
) => Promise<EngineeringForecast>;

export async function submitForecast(
  input: ForecastRequest,
  requestForecast: ForecastRequester = createForecast,
  options?: { signal?: AbortSignal },
): Promise<ForecastSubmission> {
  const request = Object.freeze({ ...input });
  const forecast = await requestForecast(request, options);
  return { forecast, request };
}
