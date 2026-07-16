import cors from 'cors';
import express, { type ErrorRequestHandler } from 'express';
import helmet from 'helmet';
import { createApiError } from '@deploy-forecast/shared';
import { config } from './config.js';
import { mapApiError } from './errors.js';
import { createRateLimiter, requestIdMiddleware } from './request-middleware.js';
import { forecastRouter } from './routes/forecast.js';
import { generatedTestsRouter } from './routes/generated-tests.js';
import { preventiveFixRouter } from './routes/preventive-fix.js';

export const app = express();

app.use(helmet());
app.use(cors({ origin: config.CLIENT_ORIGIN }));
app.use(requestIdMiddleware);
app.use(express.json({ limit: '100kb' }));

app.get('/api/health', (_request, response) => {
  response.json({ status: 'ok' });
});
app.use(
  '/api/forecast',
  createRateLimiter(config.RATE_LIMIT_WINDOW_MS, config.RATE_LIMIT_MAX),
  forecastRouter,
);
app.use(
  '/api/preventive-fix',
  createRateLimiter(config.RATE_LIMIT_WINDOW_MS, config.RATE_LIMIT_MAX),
  preventiveFixRouter,
);
app.use(
  '/api/generated-tests',
  createRateLimiter(config.RATE_LIMIT_WINDOW_MS, config.RATE_LIMIT_MAX),
  generatedTestsRouter,
);

app.use((_request, response) => {
  response.status(404).json(createApiError('NOT_FOUND', String(response.locals.requestId)));
});

const errorHandler: ErrorRequestHandler = (error, _request, response, _next) => {
  const requestId = String(response.locals.requestId);
  const mapped = mapApiError(error, requestId);
  console.error(`[${requestId}] ${error instanceof Error ? error.name : 'UnknownError'}`);
  response.status(mapped.status).json(mapped.payload);
};

app.use(errorHandler);
