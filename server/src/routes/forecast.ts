import { Router } from 'express';
import { z } from 'zod';
import { createAIProvider } from '../providers/index.js';

const requestSchema = z.object({
  code: z.string().min(20, 'Provide at least 20 characters of source code.').max(50_000),
  language: z.enum(['typescript', 'javascript']).default('typescript'),
  framework: z.literal('react').default('react'),
  scenario: z.string().max(500).optional(),
});

export const forecastRouter = Router();

forecastRouter.post('/', async (request, response, next) => {
  try {
    const input = requestSchema.parse(request.body);
    const forecast = await createAIProvider().forecast(input);
    response.status(200).json(forecast);
  } catch (error) {
    next(error);
  }
});
