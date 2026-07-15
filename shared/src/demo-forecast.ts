import type {
  EngineeringForecast,
  ForecastRequest,
  ForecastRisk,
  ForecastSignal,
  RiskCategory,
  RiskLevel,
} from './index.js';

type Finding = {
  signal: Omit<ForecastSignal, 'line'> & { needle: string };
  risk: ForecastRisk;
};

const severityPenalty: Record<RiskLevel, number> = {
  low: 4,
  medium: 9,
  high: 16,
  critical: 26,
};

const severityRank: Record<RiskLevel, number> = { low: 0, medium: 1, high: 2, critical: 3 };

function lineOf(code: string, needle: string): number | undefined {
  const index = code.indexOf(needle);
  return index < 0 ? undefined : code.slice(0, index).split('\n').length;
}

function finding(
  id: string,
  title: string,
  evidence: string,
  needle: string,
  risk: Omit<ForecastRisk, 'id' | 'signalIds'>,
): Finding {
  return {
    signal: { id: `signal-${id}`, title, evidence, needle },
    risk: { ...risk, id: `risk-${id}`, signalIds: [`signal-${id}`] },
  };
}

function inspectCode(code: string): Finding[] {
  const findings: Finding[] = [];

  if (/useEffect\s*\([\s\S]*?\}\s*\)\s*;?/m.test(code) && !/\}\s*,\s*\[[^\]]*\]\s*\)/m.test(code)) {
    findings.push(
      finding(
        'effect-loop',
        'Effect has no dependency boundary',
        'A useEffect call does not include a dependency array.',
        'useEffect',
        {
          title: 'Request and render loops may start immediately',
          summary:
            'An unbounded effect runs after every render and can trigger another state update.',
          category: 'reliability',
          level: 'critical',
          horizon: 'now',
          confidence: 'high',
          impact: 'The UI may thrash while backend traffic grows without additional users.',
          recommendation:
            'Declare precise dependencies and separate user-triggered requests from render synchronization.',
        },
      ),
    );
  }

  if (/key\s*=\s*\{\s*Math\.random\(\)\s*\}/.test(code)) {
    findings.push(
      finding(
        'unstable-key',
        'List identity changes on every render',
        'Math.random() is used as a React key.',
        'Math.random()',
        {
          title: 'Large result sets may feel unstable',
          summary: 'Generated keys force React to remount every row whenever the list renders.',
          category: 'performance',
          level: 'high',
          horizon: '7-days',
          confidence: 'high',
          impact: 'Rendering cost rises and focus or local row state can be lost.',
          recommendation: 'Use a stable domain identifier such as user.id for each key.',
        },
      ),
    );
  }

  if (/<div[^>]*onClick\s*=/.test(code)) {
    findings.push(
      finding(
        'clickable-div',
        'Click target has no native semantics',
        'A div handles click input without button behavior.',
        '<div onClick',
        {
          title: 'Keyboard users may be blocked',
          summary: 'The action cannot be reliably focused or activated from a keyboard.',
          category: 'accessibility',
          level: 'high',
          horizon: 'now',
          confidence: 'high',
          impact:
            'Some users cannot complete the workflow and accessibility defects reach production.',
          recommendation: 'Use a semantic button and retain a visible focus indicator.',
        },
      ),
    );
  }

  if (/<img\b(?![^>]*\balt=)[^>]*>/i.test(code)) {
    findings.push(
      finding(
        'image-alt',
        'Image has no text alternative',
        'An img element is missing an alt attribute.',
        '<img',
        {
          title: 'Screen-reader context may be incomplete',
          summary: 'Users who cannot see the image receive no equivalent description.',
          category: 'accessibility',
          level: 'medium',
          horizon: '30-days',
          confidence: 'high',
          impact:
            'The experience becomes harder to understand and accessibility remediation grows later.',
          recommendation: 'Add meaningful alt text, or alt="" when the image is purely decorative.',
        },
      ),
    );
  }

  if (
    /<input\b/i.test(code) &&
    !/<label\b/i.test(code) &&
    !/<input[^>]*(aria-label|aria-labelledby)=/i.test(code)
  ) {
    findings.push(
      finding(
        'input-label',
        'Input has no accessible name',
        'An input is present without an associated label.',
        '<input',
        {
          title: 'Search intent may be unclear to assistive technology',
          summary:
            'Placeholder or surrounding layout alone does not create a reliable accessible name.',
          category: 'accessibility',
          level: 'medium',
          horizon: 'now',
          confidence: 'high',
          impact: 'Screen-reader and voice-control users may not know what the field does.',
          recommendation: 'Associate a visible label or an accurate aria-label with the input.',
        },
      ),
    );
  }

  if (/\bfetch\s*\(/.test(code) && !/\.catch\s*\(|\bcatch\s*\(/.test(code)) {
    findings.push(
      finding(
        'fetch-errors',
        'Network failure is not handled',
        'A fetch call has no visible rejection path.',
        'fetch(',
        {
          title: 'Temporary API failures may become blank screens',
          summary: 'Rejected requests have no user-facing recovery or diagnostic state.',
          category: 'reliability',
          level: 'high',
          horizon: '7-days',
          confidence: 'high',
          impact: 'Users may retry blindly while support teams lack useful failure context.',
          recommendation:
            'Handle failures explicitly and render retryable loading, empty, and error states.',
        },
      ),
    );
  }

  if (/dangerouslySetInnerHTML/.test(code)) {
    findings.push(
      finding(
        'raw-html',
        'Raw HTML reaches the render tree',
        'dangerouslySetInnerHTML appears in the component.',
        'dangerouslySetInnerHTML',
        {
          title: 'Untrusted content could become an injection path',
          summary:
            'HTML rendered without a proven sanitization boundary can execute attacker-controlled markup.',
          category: 'security',
          level: 'critical',
          horizon: 'now',
          confidence: 'medium',
          impact: 'A compromised content source could expose user data or application actions.',
          recommendation:
            'Avoid raw HTML or sanitize it with an allowlist at a clearly tested trust boundary.',
        },
      ),
    );
  }

  if (/\bany\b/.test(code) || /useState\s*\(\s*\[\s*\]\s*\)/.test(code)) {
    findings.push(
      finding(
        'weak-types',
        'Data shape is not enforced',
        'State or values rely on implicit or broad typing.',
        'useState([])',
        {
          title: 'API shape changes may cause late regressions',
          summary:
            'Unchecked data can flow into rendering until an unexpected value fails at runtime.',
          category: 'maintainability',
          level: 'medium',
          horizon: '90-days',
          confidence: 'medium',
          impact: 'Refactors take longer and failures are discovered farther from their source.',
          recommendation:
            'Define domain types and validate external response data before storing it.',
        },
      ),
    );
  }

  return findings;
}

function scenarioFinding(scenario: string, code: string): Finding | null {
  const normalized = scenario.toLowerCase();
  if (!normalized.trim()) return null;

  if (/(traffic|users|scale|triple|10x|million)/.test(normalized)) {
    return finding(
      'scenario-scale',
      'Growth scenario selected',
      `What-if scenario: “${scenario}”`,
      code.includes('fetch(') ? 'fetch(' : code.slice(0, 12),
      {
        title: 'Current request behavior may amplify traffic growth',
        summary:
          'The selected growth scenario increases the cost of every unbounded or duplicate client request.',
        category: 'performance',
        level: code.includes('fetch(') ? 'high' : 'medium',
        horizon: '30-days',
        confidence: 'medium',
        impact: 'Latency and infrastructure pressure may grow faster than the active-user count.',
        recommendation:
          'Load-test the critical path, cache repeatable reads, and add request-level observability before launch.',
      },
    );
  }

  if (/(slow|latency|offline|failure|timeout|unavailable)/.test(normalized)) {
    return finding(
      'scenario-latency',
      'Dependency degradation scenario selected',
      `What-if scenario: “${scenario}”`,
      code.includes('fetch(') ? 'fetch(' : code.slice(0, 12),
      {
        title: 'Slow dependencies may trap the interface in an ambiguous state',
        summary:
          'The scenario exposes missing timeout, cancellation, retry, or stale-response behavior.',
        category: 'reliability',
        level: 'high',
        horizon: '7-days',
        confidence: 'medium',
        impact:
          'Users may repeat actions or abandon the workflow while requests remain unresolved.',
        recommendation:
          'Add timeouts, cancellation, bounded retries, and a clear recoverable error state.',
      },
    );
  }

  if (/(catalog|items|products|records|large list|100k|100,000)/.test(normalized)) {
    return finding(
      'scenario-volume',
      'Large data-volume scenario selected',
      `What-if scenario: “${scenario}”`,
      code.includes('.map(') ? '.map(' : code.slice(0, 12),
      {
        title: 'Rendering cost may grow with the full dataset',
        summary:
          'The selected volume scenario can expose list rendering, payload size, and pagination assumptions.',
        category: 'performance',
        level: code.includes('.map(') ? 'high' : 'medium',
        horizon: '30-days',
        confidence: 'medium',
        impact: 'Interaction latency and memory pressure may rise as result counts grow.',
        recommendation:
          'Add server pagination, measure payload size, and virtualize only when profiling confirms a large rendered list.',
      },
    );
  }

  return finding(
    'scenario-change',
    'Custom deployment scenario selected',
    `What-if scenario: “${scenario}”`,
    code.slice(0, 12),
    {
      title: 'The proposed change needs a targeted production check',
      summary:
        'The scenario introduces assumptions that static source inspection cannot verify alone.',
      category: 'maintainability',
      level: 'medium',
      horizon: '30-days',
      confidence: 'low',
      impact: 'Unmeasured behavior may surface only after the change reaches real traffic.',
      recommendation:
        'Define one measurable success signal and validate the scenario in a production-like test.',
    },
  );
}

function scoreCategory(risks: ForecastRisk[], category: RiskCategory): number {
  const penalty = risks
    .filter((risk) => risk.category === category)
    .reduce((total, risk) => total + severityPenalty[risk.level], 0);
  return Math.max(28, 100 - penalty);
}

export function createDemoForecast(input: ForecastRequest, provider: string): EngineeringForecast {
  const findings = inspectCode(input.code);
  const scenario = scenarioFinding(input.scenario ?? '', input.code);
  if (scenario) findings.push(scenario);

  const signals: ForecastSignal[] = findings.map(({ signal }) => ({
    id: signal.id,
    title: signal.title,
    evidence: signal.evidence,
    line: lineOf(input.code, signal.needle),
  }));
  const risks = findings
    .map(({ risk }) => risk)
    .sort((a, b) => severityRank[b.level] - severityRank[a.level]);
  const reliability = scoreCategory(risks, 'reliability');
  const performance = scoreCategory(risks, 'performance');
  const accessibility = scoreCategory(risks, 'accessibility');
  const maintainability = scoreCategory(risks, 'maintainability');
  const security = scoreCategory(risks, 'security');
  const rawHealth = Math.round(
    (reliability + performance + accessibility + maintainability + security) / 5,
  );
  const deploymentRisk = risks[0]?.level ?? 'low';
  const healthCeiling: Record<RiskLevel, number> = {
    low: 100,
    medium: 86,
    high: 74,
    critical: 59,
  };
  const health = Math.min(rawHealth, healthCeiling[deploymentRisk]);
  const scenarioSummary = input.scenario
    ? ` Under the “${input.scenario}” scenario, one additional assumption was evaluated.`
    : '';

  return {
    id: crypto.randomUUID(),
    generatedAt: new Date().toISOString(),
    provider,
    summary: risks.length
      ? `${signals.length} observable code signals produced ${risks.length} calibrated production risks.${scenarioSummary}`
      : 'No high-confidence production risks were detected by the current inspection rules. Runtime validation is still recommended.',
    deploymentRisk,
    scores: { health, reliability, performance, accessibility, maintainability },
    signals,
    risks,
    preventionPlan: [...new Set(risks.map((risk) => risk.recommendation))].slice(0, 5),
    disclaimer:
      'Forecasts are evidence-based risk assessments, not guarantees. Validate them with runtime telemetry, accessibility testing, and load testing.',
  };
}
