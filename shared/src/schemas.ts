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

export const ApiErrorSchema = z.object({
  error: z.string().min(1),
  details: z.unknown().optional(),
});

export type ForecastHorizon = z.infer<typeof ForecastHorizonSchema>;
export type RiskLevel = z.infer<typeof RiskLevelSchema>;
export type RiskCategory = z.infer<typeof RiskCategorySchema>;
export type ForecastConfidence = z.infer<typeof ForecastConfidenceSchema>;
export type ForecastRequest = z.infer<typeof ForecastRequestSchema>;
export type ForecastSignal = z.infer<typeof ForecastSignalSchema>;
export type ForecastRisk = z.infer<typeof ForecastRiskSchema>;
export type ForecastScores = z.infer<typeof ForecastScoresSchema>;
export type EngineeringForecast = z.infer<typeof EngineeringForecastSchema>;
export type ApiError = z.infer<typeof ApiErrorSchema>;
