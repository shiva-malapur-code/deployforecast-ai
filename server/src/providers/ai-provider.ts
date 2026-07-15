import type { EngineeringForecast, ForecastRequest } from '@deploy-forecast/shared';

export interface AIProvider {
  readonly name: string;
  forecast(input: ForecastRequest): Promise<EngineeringForecast>;
}
