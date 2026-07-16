import { randomUUID } from 'node:crypto';
import type { RequestHandler } from 'express';
import { API_ERROR_DEFINITIONS, createApiError } from '@deploy-forecast/shared';

export const requestIdMiddleware: RequestHandler = (_request, response, next) => {
  const requestId = randomUUID();
  response.locals.requestId = requestId;
  response.setHeader('X-Request-ID', requestId);
  next();
};

export function createRateLimiter(windowMs: number, maximum: number): RequestHandler {
  const clients = new Map<string, { count: number; resetAt: number }>();

  return (request, response, next) => {
    const now = Date.now();
    const key = request.ip || 'unknown';
    const current = clients.get(key);
    const entry =
      !current || current.resetAt <= now ? { count: 0, resetAt: now + windowMs } : current;
    entry.count += 1;
    clients.set(key, entry);

    response.setHeader('RateLimit-Limit', maximum);
    response.setHeader('RateLimit-Remaining', Math.max(0, maximum - entry.count));

    if (entry.count > maximum) {
      const requestId = String(response.locals.requestId);
      response
        .status(API_ERROR_DEFINITIONS.RATE_LIMITED.status)
        .json(createApiError('RATE_LIMITED', requestId));
      return;
    }

    next();
  };
}
