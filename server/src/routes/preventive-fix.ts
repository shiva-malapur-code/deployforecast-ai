import { Router } from 'express';
import { PreventiveFixRequestSchema } from '@deploy-forecast/shared';
import { config } from '../config.js';
import { executeProviderPreventiveFix } from '../provider-execution.js';
import { createAIProvider } from '../providers/index.js';

export const preventiveFixRouter = Router();

preventiveFixRouter.post('/', async (request, response, next) => {
  try {
    const input = PreventiveFixRequestSchema.parse(request.body);
    const fix = await executeProviderPreventiveFix(createAIProvider(), input, {
      requestTimeoutMs: config.REQUEST_TIMEOUT_MS,
      providerTimeoutMs: config.PROVIDER_TIMEOUT_MS,
    });
    response.status(200).json(fix);
  } catch (error) {
    next(error);
  }
});
