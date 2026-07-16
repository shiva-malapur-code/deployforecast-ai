import type {
  EngineeringForecast,
  ForecastRequest,
  ForecastRisk,
  ForecastSnapshot,
  ForecastSignal,
  RiskCategory,
  RiskLevel,
  ScenarioForecast,
} from './schemas.js';
import { compareForecastRisks } from './scenario-comparison.js';

type Finding = {
  signal: Omit<ForecastSignal, 'line'> & { index: number };
  risk: ForecastRisk;
};

type CallExpression = {
  start: number;
  openParenthesis: number;
  closeParenthesis: number;
};

const severityPenalty: Record<RiskLevel, number> = {
  low: 4,
  medium: 9,
  high: 16,
  critical: 26,
};

const severityRank: Record<RiskLevel, number> = { low: 0, medium: 1, high: 2, critical: 3 };

function lineOf(code: string, index: number): number | undefined {
  return index < 0 ? undefined : code.slice(0, index).split('\n').length;
}

function findClosingParenthesis(code: string, openParenthesis: number): number | undefined {
  let depth = 0;
  let quote: "'" | '"' | '`' | null = null;
  let escaped = false;
  let lineComment = false;
  let blockComment = false;

  for (let index = openParenthesis; index < code.length; index += 1) {
    const character = code[index];
    const nextCharacter = code[index + 1];

    if (lineComment) {
      if (character === '\n') lineComment = false;
      continue;
    }
    if (blockComment) {
      if (character === '*' && nextCharacter === '/') {
        blockComment = false;
        index += 1;
      }
      continue;
    }
    if (quote) {
      if (escaped) {
        escaped = false;
      } else if (character === '\\') {
        escaped = true;
      } else if (character === quote) {
        quote = null;
      }
      continue;
    }
    if (character === '/' && nextCharacter === '/') {
      lineComment = true;
      index += 1;
      continue;
    }
    if (character === '/' && nextCharacter === '*') {
      blockComment = true;
      index += 1;
      continue;
    }
    if (character === "'" || character === '"' || character === '`') {
      quote = character;
      continue;
    }
    if (character === '(') depth += 1;
    if (character === ')') {
      depth -= 1;
      if (depth === 0) return index;
    }
  }

  return undefined;
}

function findCalls(code: string, callee: string): CallExpression[] {
  const calls: CallExpression[] = [];
  const expression = new RegExp(`\\b${callee}\\s*\\(`, 'g');

  for (const match of code.matchAll(expression)) {
    const start = match.index;
    const openParenthesis = start + match[0].lastIndexOf('(');
    const closeParenthesis = findClosingParenthesis(code, openParenthesis);
    if (closeParenthesis !== undefined) {
      calls.push({ start, openParenthesis, closeParenthesis });
    }
  }

  return calls;
}

function hasTopLevelArgumentSeparator(code: string, call: CallExpression): boolean {
  let roundDepth = 0;
  let squareDepth = 0;
  let curlyDepth = 0;
  let quote: "'" | '"' | '`' | null = null;
  let escaped = false;

  for (let index = call.openParenthesis + 1; index < call.closeParenthesis; index += 1) {
    const character = code[index];
    if (quote) {
      if (escaped) escaped = false;
      else if (character === '\\') escaped = true;
      else if (character === quote) quote = null;
      continue;
    }
    if (character === "'" || character === '"' || character === '`') {
      quote = character;
      continue;
    }
    if (character === '(') roundDepth += 1;
    else if (character === ')') roundDepth -= 1;
    else if (character === '[') squareDepth += 1;
    else if (character === ']') squareDepth -= 1;
    else if (character === '{') curlyDepth += 1;
    else if (character === '}') curlyDepth -= 1;
    else if (character === ',' && roundDepth === 0 && squareDepth === 0 && curlyDepth === 0) {
      return true;
    }
  }

  return false;
}

function chainedMethodNames(code: string, call: CallExpression): string[] {
  const methods: string[] = [];
  let cursor = call.closeParenthesis + 1;

  while (cursor < code.length) {
    while (/\s/.test(code[cursor] ?? '')) cursor += 1;
    if (code[cursor] === '?' && code[cursor + 1] === '.') cursor += 1;
    if (code[cursor] !== '.') break;
    cursor += 1;

    const methodStart = cursor;
    while (/[A-Za-z0-9_$]/.test(code[cursor] ?? '')) cursor += 1;
    const method = code.slice(methodStart, cursor);
    while (/\s/.test(code[cursor] ?? '')) cursor += 1;
    if (!method || code[cursor] !== '(') break;

    const closeParenthesis = findClosingParenthesis(code, cursor);
    if (closeParenthesis === undefined) break;
    methods.push(method);
    cursor = closeParenthesis + 1;
  }

  return methods;
}

function indexedId(base: string, index: number): string {
  return index === 0 ? base : `${base}-${index + 1}`;
}

function finding(
  id: string,
  title: string,
  evidence: string,
  index: number,
  risk: Omit<ForecastRisk, 'id' | 'signalIds'>,
): Finding {
  return {
    signal: { id: `signal-${id}`, title, evidence, index },
    risk: { ...risk, id: `risk-${id}`, signalIds: [`signal-${id}`] },
  };
}

function inspectCode(code: string): Finding[] {
  const findings: Finding[] = [];

  let missingEffectCount = 0;
  findCalls(code, 'useEffect').forEach((effect) => {
    if (!hasTopLevelArgumentSeparator(code, effect)) {
      findings.push(
        finding(
          indexedId('effect-loop', missingEffectCount),
          'Effect has no dependency boundary',
          'A useEffect call does not include a dependency array.',
          effect.start,
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
      missingEffectCount += 1;
    }
  });

  const unstableKey = /key\s*=\s*\{\s*Math\.random\(\)\s*\}/.exec(code);
  if (unstableKey) {
    findings.push(
      finding(
        'unstable-key',
        'List identity changes on every render',
        'Math.random() is used as a React key.',
        unstableKey.index,
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

  const clickableDiv = /<div[^>]*onClick\s*=/.exec(code);
  if (clickableDiv) {
    findings.push(
      finding(
        'clickable-div',
        'Click target has no native semantics',
        'A div handles click input without button behavior.',
        clickableDiv.index,
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

  const imageWithoutAlt = /<img\b(?![^>]*\balt=)[^>]*>/i.exec(code);
  if (imageWithoutAlt) {
    findings.push(
      finding(
        'image-alt',
        'Image has no text alternative',
        'An img element is missing an alt attribute.',
        imageWithoutAlt.index,
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

  const labelledInputIds = new Set(
    [...code.matchAll(/<label\b[^>]*(?:htmlFor|for)\s*=\s*["']([^"']+)["'][^>]*>/gi)]
      .map((match) => match[1])
      .filter((id): id is string => Boolean(id)),
  );
  let unlabelledInputCount = 0;
  [...code.matchAll(/<input\b[^>]*>/gi)].forEach((input) => {
    const inputMarkup = input[0];
    const inputId = /\bid\s*=\s*["']([^"']+)["']/i.exec(inputMarkup)?.[1];
    const hasAccessibleName = /\b(?:aria-label|aria-labelledby)\s*=/i.test(inputMarkup);
    const beforeInput = code.slice(0, input.index).toLowerCase();
    const wrappedByLabel =
      beforeInput.lastIndexOf('<label') > beforeInput.lastIndexOf('</label>') &&
      code.toLowerCase().indexOf('</label>', input.index) >= 0;
    const explicitlyLabelled = Boolean(inputId && labelledInputIds.has(inputId));

    if (!hasAccessibleName && !wrappedByLabel && !explicitlyLabelled) {
      findings.push(
        finding(
          indexedId('input-label', unlabelledInputCount),
          'Input has no accessible name',
          'An input is present without an associated label.',
          input.index,
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
      unlabelledInputCount += 1;
    }
  });

  let unhandledFetchCount = 0;
  findCalls(code, 'fetch').forEach((fetchCall) => {
    if (!chainedMethodNames(code, fetchCall).includes('catch')) {
      findings.push(
        finding(
          indexedId('fetch-errors', unhandledFetchCount),
          'Network failure is not handled',
          'A fetch call has no visible rejection path.',
          fetchCall.start,
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
      unhandledFetchCount += 1;
    }
  });

  const rawHtml = /dangerouslySetInnerHTML/.exec(code);
  if (rawHtml) {
    findings.push(
      finding(
        'raw-html',
        'Raw HTML reaches the render tree',
        'dangerouslySetInnerHTML appears in the component.',
        rawHtml.index,
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

  const broadType = /\bany\b/.exec(code);
  const implicitArrayState = /useState\s*\(\s*\[\s*\]\s*\)/.exec(code);
  const weakTyping =
    broadType && implicitArrayState
      ? broadType.index <= implicitArrayState.index
        ? broadType
        : implicitArrayState
      : (broadType ?? implicitArrayState);
  if (weakTyping) {
    findings.push(
      finding(
        'weak-types',
        'Data shape is not enforced',
        broadType && weakTyping.index === broadType.index
          ? 'The any type bypasses compile-time data-shape checks.'
          : 'State relies on an implicitly typed empty array.',
        weakTyping.index,
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

function scoreCategory(risks: ForecastRisk[], category: RiskCategory): number {
  const penalty = risks
    .filter((risk) => risk.category === category)
    .reduce((total, risk) => total + severityPenalty[risk.level], 0);
  return Math.max(28, 100 - penalty);
}

const disclaimer =
  'Forecasts are evidence-based risk assessments, not guarantees. Validate them with runtime telemetry, accessibility testing, and load testing.';

function createBaselineSnapshot(code: string): ForecastSnapshot {
  const findings = inspectCode(code);
  const signals: ForecastSignal[] = findings.map(({ signal }) => ({
    id: signal.id,
    title: signal.title,
    evidence: signal.evidence,
    line: lineOf(code, signal.index),
  }));
  const risks = findings.map(({ risk }) => risk);
  const summary = risks.length
    ? `${signals.length} observable code signals produced ${risks.length} calibrated production risks.`
    : 'No high-confidence production risks were detected by the current inspection rules. Runtime validation is still recommended.';

  return createSnapshot(signals, risks, summary);
}

function createSnapshot(
  signals: ForecastSignal[],
  unsortedRisks: ForecastRisk[],
  summary: string,
): ForecastSnapshot {
  const risks = [...unsortedRisks].sort(
    (left, right) => severityRank[right.level] - severityRank[left.level],
  );
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

  return {
    summary,
    deploymentRisk,
    scores: { health, reliability, performance, accessibility, security, maintainability },
    signals,
    risks,
    preventionPlan: [...new Set(risks.map((risk) => risk.recommendation))].slice(0, 5),
    disclaimer,
  };
}

function scenarioSignal(id: string, title: string, scenario: string): ForecastSignal {
  return {
    id: `signal-${id}`,
    title,
    evidence: `User-supplied scenario: “${scenario}”`,
  };
}

function scenarioRisk(
  id: string,
  signalId: string,
  risk: Omit<ForecastRisk, 'id' | 'signalIds'>,
): ForecastRisk {
  return { ...risk, id: `risk-${id}`, signalIds: [signalId] };
}

function nextSeverity(level: RiskLevel): RiskLevel {
  const next: Record<RiskLevel, RiskLevel> = {
    low: 'medium',
    medium: 'high',
    high: 'critical',
    critical: 'critical',
  };
  return next[level];
}

function previousSeverity(level: RiskLevel): RiskLevel {
  const previous: Record<RiskLevel, RiskLevel> = {
    low: 'low',
    medium: 'low',
    high: 'medium',
    critical: 'high',
  };
  return previous[level];
}

function createScenarioForecast(
  scenario: string,
  code: string,
  baseline: ForecastSnapshot,
): { snapshot: ForecastSnapshot; details: ScenarioForecast } {
  const normalized = scenario.toLowerCase();
  const signals = baseline.signals.map((signal) => ({ ...signal }));
  let risks = baseline.risks.map((risk) => ({ ...risk, signalIds: [...risk.signalIds] }));
  const assumptions = [
    'The submitted source and baseline forecast remain unchanged; only the user-supplied scenario varies.',
  ];
  const limitations = [
    'Static source inspection cannot verify actual production load, dependency latency, user behavior, or infrastructure capacity.',
    'Severity changes are directional risk assessments, not measured probabilities or benchmark results.',
    'No exact traffic, revenue, latency, or performance values are inferred beyond values explicitly supplied in the scenario.',
  ];
  let matchedFactor = false;

  const addSignal = (signal: ForecastSignal) => {
    if (!signals.some((item) => item.id === signal.id)) signals.push(signal);
  };
  const addRisk = (risk: ForecastRisk) => {
    if (!risks.some((item) => item.id === risk.id)) risks.push(risk);
  };
  const changeRisks = (
    matches: (risk: ForecastRisk) => boolean,
    changeLevel: (level: RiskLevel) => RiskLevel,
    signalId: string,
  ) => {
    risks = risks.map((risk) =>
      matches(risk)
        ? {
            ...risk,
            level: changeLevel(risk.level),
            confidence: risk.confidence === 'low' ? 'low' : 'medium',
            signalIds: [...new Set([...risk.signalIds, signalId])],
          }
        : risk,
    );
  };

  if (/(traffic|users|scale|triple|10x|million)/.test(normalized)) {
    matchedFactor = true;
    const signal = scenarioSignal('scenario-scale', 'Growth scenario selected', scenario);
    addSignal(signal);
    addRisk(
      scenarioRisk('scenario-scale', signal.id, {
        title: 'Current request behavior may amplify traffic growth',
        summary:
          'The growth scenario increases the operational cost of unbounded or duplicate client requests.',
        category: 'performance',
        level: code.includes('fetch(') ? 'high' : 'medium',
        horizon: '30-days',
        confidence: 'medium',
        impact:
          'Latency and infrastructure pressure may grow as more users exercise the same path.',
        recommendation:
          'Load-test the critical path, cache repeatable reads, and add request-level observability before launch.',
      }),
    );
    assumptions.push(
      'The growth scenario exercises the same client request paths shown in the source.',
    );
  }

  if (/(slow|latency|offline|failure|unavailable)/.test(normalized)) {
    matchedFactor = true;
    const signal = scenarioSignal(
      'scenario-latency',
      'Dependency degradation scenario selected',
      scenario,
    );
    addSignal(signal);
    addRisk(
      scenarioRisk('scenario-latency', signal.id, {
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
      }),
    );
    changeRisks((risk) => risk.id.startsWith('risk-fetch-errors'), nextSeverity, signal.id);
    assumptions.push(
      'The degraded dependency affects fetch calls visible in the submitted component.',
    );
  }

  if (/(catalog|items|products|records|large list|100k|100,000)/.test(normalized)) {
    matchedFactor = true;
    const signal = scenarioSignal(
      'scenario-volume',
      'Large data-volume scenario selected',
      scenario,
    );
    addSignal(signal);
    addRisk(
      scenarioRisk('scenario-volume', signal.id, {
        title: 'Rendering cost may grow with the full dataset',
        summary:
          'The data-volume scenario can expose list rendering, payload size, and pagination assumptions.',
        category: 'performance',
        level: code.includes('.map(') ? 'high' : 'medium',
        horizon: '30-days',
        confidence: 'medium',
        impact: 'Interaction latency and memory pressure may rise as result counts grow.',
        recommendation:
          'Add server pagination, measure payload size, and virtualize only when profiling confirms a large rendered list.',
      }),
    );
    changeRisks((risk) => risk.id === 'risk-unstable-key', nextSeverity, signal.id);
    assumptions.push('The larger dataset reaches the list-rendering path visible in the source.');
  }

  const positiveChange = /(add|enable|introduc|implement|adopt|with|use)/.test(normalized);
  if (positiveChange && /(retry|retries|error state|fallback|cancell)/.test(normalized)) {
    matchedFactor = true;
    const signal = scenarioSignal(
      'scenario-resilience',
      'Resilience mitigation scenario selected',
      scenario,
    );
    addSignal(signal);
    changeRisks((risk) => risk.id.startsWith('risk-fetch-errors'), previousSeverity, signal.id);
    assumptions.push('The stated resilience behavior is implemented on the affected request path.');
  }

  if (!matchedFactor) {
    assumptions.push(
      'The scenario does not map to a supported deterministic mock factor, so baseline risk severities are held constant.',
    );
  }

  let snapshot = createSnapshot(signals, risks, 'Scenario forecast pending comparison.');
  const comparisons = compareForecastRisks(baseline.risks, snapshot.risks);
  const totals = comparisons.reduce(
    (counts, comparison) => ({ ...counts, [comparison.status]: counts[comparison.status] + 1 }),
    { new: 0, increased: 0, decreased: 0, unchanged: 0 },
  );
  snapshot = {
    ...snapshot,
    summary: `Scenario forecast for “${scenario}”: ${totals.new} new, ${totals.increased} increased, ${totals.decreased} decreased, and ${totals.unchanged} unchanged risks compared with baseline.`,
  };

  return {
    snapshot,
    details: {
      label: 'Scenario forecast',
      input: scenario,
      comparisonMethod: 'normalized-title-category',
      baseline,
      comparisons,
      assumptions,
      limitations,
    },
  };
}

export function createDemoForecast(input: ForecastRequest, provider: string): EngineeringForecast {
  const baseline = createBaselineSnapshot(input.code);
  const scenarioInput = input.scenario?.trim();
  const scenario = scenarioInput
    ? createScenarioForecast(scenarioInput, input.code, baseline)
    : undefined;

  return {
    id: crypto.randomUUID(),
    generatedAt: new Date().toISOString(),
    provider,
    ...(scenario?.snapshot ?? baseline),
    scenario: scenario?.details,
  };
}
