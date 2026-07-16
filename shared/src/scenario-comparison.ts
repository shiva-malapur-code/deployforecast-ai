import type {
  EngineeringForecast,
  ForecastRequest,
  ForecastRisk,
  RiskLevel,
  ScenarioRiskComparison,
} from './schemas.js';

const severityRank: Record<RiskLevel, number> = {
  low: 0,
  medium: 1,
  high: 2,
  critical: 3,
};

export function normalizeRiskTitle(title: string): string {
  return title
    .normalize('NFKD')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

export function getRiskComparisonKey(risk: Pick<ForecastRisk, 'category' | 'title'>): string {
  return `${risk.category}:${normalizeRiskTitle(risk.title)}`;
}

export function compareForecastRisks(
  baselineRisks: ForecastRisk[],
  scenarioRisks: ForecastRisk[],
): ScenarioRiskComparison[] {
  const baselineByKey = new Map(
    baselineRisks.map((risk) => [getRiskComparisonKey(risk), risk] as const),
  );

  return scenarioRisks.map((scenarioRisk) => {
    const key = getRiskComparisonKey(scenarioRisk);
    const baselineRisk = baselineByKey.get(key);
    const status = baselineRisk
      ? severityRank[scenarioRisk.level] > severityRank[baselineRisk.level]
        ? 'increased'
        : severityRank[scenarioRisk.level] < severityRank[baselineRisk.level]
          ? 'decreased'
          : 'unchanged'
      : 'new';

    return {
      key,
      status,
      category: scenarioRisk.category,
      title: scenarioRisk.title,
      baselineRiskId: baselineRisk?.id,
      scenarioRiskId: scenarioRisk.id,
      baselineLevel: baselineRisk?.level,
      scenarioLevel: scenarioRisk.level,
      confidence: scenarioRisk.confidence,
      signalIds: scenarioRisk.signalIds,
    };
  });
}

export function validateScenarioForecast(
  forecast: EngineeringForecast,
  input: ForecastRequest,
): boolean {
  const scenarioInput = input.scenario?.trim();
  if (!scenarioInput) return forecast.scenario === undefined;
  if (!forecast.scenario || forecast.scenario.input !== scenarioInput) return false;

  const baselineKeys = new Set(forecast.scenario.baseline.risks.map(getRiskComparisonKey));
  const scenarioKeys = new Set(forecast.risks.map(getRiskComparisonKey));
  if ([...baselineKeys].some((key) => !scenarioKeys.has(key))) return false;

  const expected = compareForecastRisks(forecast.scenario.baseline.risks, forecast.risks);
  const byKey = (left: ScenarioRiskComparison, right: ScenarioRiskComparison) =>
    left.key.localeCompare(right.key);
  return (
    JSON.stringify([...expected].sort(byKey)) ===
    JSON.stringify([...forecast.scenario.comparisons].sort(byKey))
  );
}
