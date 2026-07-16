import { z } from 'zod';

export const ForecastHorizonSchema = z.enum(['now', '7-days', '30-days', '90-days']);
export const RiskLevelSchema = z.enum(['low', 'medium', 'high', 'critical']);
export const RiskCategorySchema = z.enum([
  'reliability',
  'performance',
  'accessibility',
  'security',
  'maintainability',
]);
export const ForecastConfidenceSchema = z.enum(['low', 'medium', 'high']);

export const ForecastRequestSchema = z.object({
  code: z.string().min(20, 'Provide at least 20 characters of source code.').max(50_000),
  language: z.enum(['typescript', 'javascript']).default('typescript'),
  framework: z.literal('react').default('react'),
  scenario: z.string().max(500).optional(),
});

export const ForecastSignalSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  evidence: z.string().min(1),
  line: z.number().int().positive().optional(),
});

export const ForecastRiskSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  summary: z.string().min(1),
  category: RiskCategorySchema,
  level: RiskLevelSchema,
  horizon: ForecastHorizonSchema,
  confidence: ForecastConfidenceSchema,
  impact: z.string().min(1),
  recommendation: z.string().min(1),
  signalIds: z.array(z.string().min(1)),
});

const ScoreSchema = z.number().int().min(0).max(100);

export const ForecastScoresSchema = z.object({
  health: ScoreSchema,
  reliability: ScoreSchema,
  performance: ScoreSchema,
  accessibility: ScoreSchema,
  security: ScoreSchema,
  maintainability: ScoreSchema,
});

export const EngineeringForecastSchema = z.object({
  id: z.string().min(1),
  generatedAt: z.string().datetime(),
  provider: z.string().min(1),
  summary: z.string().min(1),
  deploymentRisk: RiskLevelSchema,
  scores: ForecastScoresSchema,
  signals: z.array(ForecastSignalSchema),
  risks: z.array(ForecastRiskSchema),
  preventionPlan: z.array(z.string().min(1)),
  disclaimer: z.string().min(1),
});

export const ApiErrorCodeSchema = z.enum([
  'INVALID_REQUEST',
  'RATE_LIMITED',
  'REQUEST_TIMEOUT',
  'PROVIDER_TIMEOUT',
  'INVALID_PROVIDER_RESPONSE',
  'PROVIDER_UNAVAILABLE',
  'NOT_FOUND',
  'INTERNAL_ERROR',
]);

export const ApiErrorSchema = z.object({
  error: z.string().min(1),
  code: ApiErrorCodeSchema,
  requestId: z.string().min(1),
  recoverable: z.boolean(),
  details: z.unknown().optional(),
});

export const API_ERROR_DEFINITIONS = {
  INVALID_REQUEST: {
    status: 400,
    message: 'The forecast request is invalid. Review the code and scenario, then try again.',
    recoverable: false,
  },
  RATE_LIMITED: {
    status: 429,
    message: 'Too many forecasts were requested. Wait a moment, then try again.',
    recoverable: true,
  },
  REQUEST_TIMEOUT: {
    status: 504,
    message: 'The forecast request took too long. Please try again.',
    recoverable: true,
  },
  PROVIDER_TIMEOUT: {
    status: 504,
    message: 'The forecast provider took too long to respond. Please try again.',
    recoverable: true,
  },
  INVALID_PROVIDER_RESPONSE: {
    status: 502,
    message: 'The forecast provider returned an unusable response. Please try again.',
    recoverable: true,
  },
  PROVIDER_UNAVAILABLE: {
    status: 502,
    message: 'The forecast provider is temporarily unavailable. Please try again.',
    recoverable: true,
  },
  NOT_FOUND: {
    status: 404,
    message: 'The requested resource was not found.',
    recoverable: false,
  },
  INTERNAL_ERROR: {
    status: 500,
    message: 'The forecast could not be generated. Please try again.',
    recoverable: true,
  },
} as const satisfies Record<
  z.infer<typeof ApiErrorCodeSchema>,
  { status: number; message: string; recoverable: boolean }
>;

export function createApiError(
  code: z.infer<typeof ApiErrorCodeSchema>,
  requestId: string,
  details?: unknown,
) {
  const definition = API_ERROR_DEFINITIONS[code];
  return ApiErrorSchema.parse({
    error: definition.message,
    code,
    requestId,
    recoverable: definition.recoverable,
    details,
  });
}

export type ForecastHorizon = z.infer<typeof ForecastHorizonSchema>;
export type RiskLevel = z.infer<typeof RiskLevelSchema>;
export type RiskCategory = z.infer<typeof RiskCategorySchema>;
export type ForecastConfidence = z.infer<typeof ForecastConfidenceSchema>;
export type ForecastRequest = z.infer<typeof ForecastRequestSchema>;
export type ForecastSignal = z.infer<typeof ForecastSignalSchema>;
export type ForecastRisk = z.infer<typeof ForecastRiskSchema>;
export type ForecastScores = z.infer<typeof ForecastScoresSchema>;
export type EngineeringForecast = z.infer<typeof EngineeringForecastSchema>;
export type ApiErrorCode = z.infer<typeof ApiErrorCodeSchema>;
export type ApiError = z.infer<typeof ApiErrorSchema>;
