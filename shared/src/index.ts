export type ForecastHorizon = 'now' | '7-days' | '30-days' | '90-days';
export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';
export type RiskCategory =
  'reliability' | 'performance' | 'accessibility' | 'security' | 'maintainability';

export interface ForecastRequest {
  code: string;
  language: 'typescript' | 'javascript';
  framework: 'react';
  scenario?: string;
}

export interface ForecastSignal {
  id: string;
  title: string;
  evidence: string;
  line?: number;
}

export interface ForecastRisk {
  id: string;
  title: string;
  summary: string;
  category: RiskCategory;
  level: RiskLevel;
  horizon: ForecastHorizon;
  confidence: 'low' | 'medium' | 'high';
  impact: string;
  recommendation: string;
  signalIds: string[];
}

export interface ForecastScores {
  health: number;
  reliability: number;
  performance: number;
  accessibility: number;
  maintainability: number;
}

export interface EngineeringForecast {
  id: string;
  generatedAt: string;
  provider: string;
  summary: string;
  deploymentRisk: RiskLevel;
  scores: ForecastScores;
  signals: ForecastSignal[];
  risks: ForecastRisk[];
  preventionPlan: string[];
  disclaimer: string;
}

export interface ApiError {
  error: string;
  details?: unknown;
}

export { createDemoForecast } from './demo-forecast.js';
