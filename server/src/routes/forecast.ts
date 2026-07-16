import { Router } from 'express';
import { ForecastRequestSchema } from '@deploy-forecast/shared';
import { createAIProvider } from '../providers/index.js';

export const forecastRouter = Router();

forecastRouter.post('/', async (request, response, next) => {
  try {
    const input = ForecastRequestSchema.parse(request.body);
    const forecast = await createAIProvider().forecast(input);
    response.status(200).json(forecast);
  } catch (error) {
    next(error);
  }
});
