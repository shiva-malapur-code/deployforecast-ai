import type { EngineeringForecast, ForecastRisk, RiskCategory, RiskLevel } from './schemas.js';
import { getRiskComparisonKey } from './scenario-comparison.js';

export type VerificationStatus = 'resolved' | 'reduced' | 'unchanged' | 'increased' | 'new';

export type VerificationRiskComparison = {
  key: string;
  status: VerificationStatus;
  category: RiskCategory;
  title: string;
  beforeRiskId?: string;
  afterRiskId?: string;
  beforeLevel?: RiskLevel;
  afterLevel?: RiskLevel;
};

export type ForecastVerification = {
  beforeHealth: number;
  afterHealth: number;
  beforeRiskCount: number;
  afterRiskCount: number;
  counts: Record<VerificationStatus, number>;
  comparisons: VerificationRiskComparison[];
};

const severityRank: Record<RiskLevel, number> = {
  low: 0,
  medium: 1,
  high: 2,
  critical: 3,
};

function compareMatchedRisk(before: ForecastRisk, after: ForecastRisk): VerificationStatus {
  if (severityRank[after.level] < severityRank[before.level]) return 'reduced';
  if (severityRank[after.level] > severityRank[before.level]) return 'increased';
  return 'unchanged';
}

export function compareForecastVersions(
  before: EngineeringForecast,
  after: EngineeringForecast,
): ForecastVerification {
  const beforeByKey = new Map(before.risks.map((risk) => [getRiskComparisonKey(risk), risk]));
  const afterByKey = new Map(after.risks.map((risk) => [getRiskComparisonKey(risk), risk]));
  const comparisons: VerificationRiskComparison[] = [];

  for (const [key, beforeRisk] of beforeByKey) {
    const afterRisk = afterByKey.get(key);
    comparisons.push({
      key,
      status: afterRisk ? compareMatchedRisk(beforeRisk, afterRisk) : 'resolved',
      category: beforeRisk.category,
      title: beforeRisk.title,
      beforeRiskId: beforeRisk.id,
      afterRiskId: afterRisk?.id,
      beforeLevel: beforeRisk.level,
      afterLevel: afterRisk?.level,
    });
  }

  for (const [key, afterRisk] of afterByKey) {
    if (beforeByKey.has(key)) continue;
    comparisons.push({
      key,
      status: 'new',
      category: afterRisk.category,
      title: afterRisk.title,
      afterRiskId: afterRisk.id,
      afterLevel: afterRisk.level,
    });
  }

  const counts: Record<VerificationStatus, number> = {
    resolved: 0,
    reduced: 0,
    unchanged: 0,
    increased: 0,
    new: 0,
  };
  comparisons.forEach((comparison) => {
    counts[comparison.status] += 1;
  });

  return {
    beforeHealth: before.scores.health,
    afterHealth: after.scores.health,
    beforeRiskCount: before.risks.length,
    afterRiskCount: after.risks.length,
    counts,
    comparisons,
  };
}
