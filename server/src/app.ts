import cors from 'cors';
import express, { type ErrorRequestHandler } from 'express';
import helmet from 'helmet';
import { ZodError } from 'zod';
import { ApiErrorSchema } from '@deploy-forecast/shared';
import { config } from './config.js';
import { ProviderOutputError } from './providers/provider-output.js';
import { forecastRouter } from './routes/forecast.js';

export const app = express();

app.use(helmet());
app.use(cors({ origin: config.CLIENT_ORIGIN }));
app.use(express.json({ limit: '100kb' }));

app.get('/api/health', (_request, response) => {
  response.json({ status: 'ok' });
});
app.use('/api/forecast', forecastRouter);

app.use((_request, response) => {
  response.status(404).json(ApiErrorSchema.parse({ error: 'Route not found' }));
});

const errorHandler: ErrorRequestHandler = (error, _request, response, _next) => {
  if (error instanceof ZodError) {
    response
      .status(400)
      .json(ApiErrorSchema.parse({ error: 'Invalid forecast request', details: error.flatten() }));
    return;
  }

  if (error instanceof ProviderOutputError) {
    console.error(`Invalid forecast from ${error.provider}`, error.cause);
    response.status(502).json(ApiErrorSchema.parse({ error: error.message }));
    return;
  }

  console.error(error);
  response.status(500).json(ApiErrorSchema.parse({ error: 'Forecast generation failed' }));
};

app.use(errorHandler);
