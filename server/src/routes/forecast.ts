import { Router } from 'express';
import { ForecastRequestSchema } from '@deploy-forecast/shared';
import { config } from '../config.js';
import { executeProviderForecast } from '../provider-execution.js';
import { createAIProvider } from '../providers/index.js';

export const forecastRouter = Router();

forecastRouter.post('/', async (request, response, next) => {
  try {
    const input = ForecastRequestSchema.parse(request.body);
    const forecast = await executeProviderForecast(createAIProvider(), input, {
      requestTimeoutMs: config.REQUEST_TIMEOUT_MS,
      providerTimeoutMs: config.PROVIDER_TIMEOUT_MS,
    });
    response.status(200).json(forecast);
  } catch (error) {
    next(error);
  }
});
