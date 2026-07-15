import cors from 'cors';
import express, { type ErrorRequestHandler } from 'express';
import helmet from 'helmet';
import { ZodError } from 'zod';
import { config } from './config.js';
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
  response.status(404).json({ error: 'Route not found' });
});

const errorHandler: ErrorRequestHandler = (error, _request, response, _next) => {
  if (error instanceof ZodError) {
    response.status(400).json({ error: 'Invalid forecast request', details: error.flatten() });
    return;
  }

  console.error(error);
  response.status(500).json({ error: 'Forecast generation failed' });
};

app.use(errorHandler);
