import { Router } from 'express';
import { GeneratedTestsRequestSchema } from '@deploy-forecast/shared';
import { config } from '../config.js';
import { executeProviderGeneratedTests } from '../provider-execution.js';
import { createAIProvider } from '../providers/index.js';

export const generatedTestsRouter = Router();

generatedTestsRouter.post('/', async (request, response, next) => {
  try {
    const input = GeneratedTestsRequestSchema.parse(request.body);
    const tests = await executeProviderGeneratedTests(createAIProvider(), input, {
      requestTimeoutMs: config.REQUEST_TIMEOUT_MS,
      providerTimeoutMs: config.PROVIDER_TIMEOUT_MS,
    });
    response.status(200).json(tests);
  } catch (error) {
    next(error);
  }
});
