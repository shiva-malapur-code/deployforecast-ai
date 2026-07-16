import type { EngineeringForecast, ForecastRequest } from '@deploy-forecast/shared';
import { createForecast } from '@/services/forecast-api';

export interface ForecastSubmission {
  forecast: EngineeringForecast;
  request: Readonly<ForecastRequest>;
}

type ForecastRequester = (request: ForecastRequest) => Promise<EngineeringForecast>;

export async function submitForecast(
  input: ForecastRequest,
  requestForecast: ForecastRequester = createForecast,
): Promise<ForecastSubmission> {
  const request = Object.freeze({ ...input });
  const forecast = await requestForecast(request);
  return { forecast, request };
}
