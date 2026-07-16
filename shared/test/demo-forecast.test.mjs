import assert from 'node:assert/strict';
import test from 'node:test';
import { compareForecastRisks, createDemoForecast } from '../dist/index.js';

test('derives risks from observable code signals', () => {
  const forecast = createDemoForecast(
    {
      code: `function Search() {
        useEffect(() => { fetch('/api/search').then(setData) });
        return <div onClick={() => {}}><img src="avatar.png" /></div>;
      }`,
      language: 'typescript',
      framework: 'react',
    },
    'test',
  );

  assert.equal(forecast.provider, 'test');
  assert.ok(forecast.risks.some((risk) => risk.id === 'risk-effect-loop'));
  assert.ok(forecast.risks.some((risk) => risk.category === 'accessibility'));
  assert.equal(forecast.deploymentRisk, 'critical');
  assert.ok(forecast.scores.health <= 59);
});

test('recognizes a large catalog scenario as a performance forecast', () => {
  const forecast = createDemoForecast(
    {
      code: `export function List({ items }) { return items.map((item) => <div key={item.id}>{item.name}</div>); }`,
      language: 'typescript',
      framework: 'react',
      scenario: 'The catalog reaches 100k items',
    },
    'test',
  );

  assert.ok(forecast.risks.some((risk) => risk.id === 'risk-scenario-volume'));
});

test('adds a calibrated what-if scenario without inventing probabilities', () => {
  const forecast = createDemoForecast(
    {
      code: `export function Button() { return <button>Save</button>; }`,
      language: 'typescript',
      framework: 'react',
      scenario: 'Traffic grows 10×',
    },
    'test',
  );

  assert.ok(forecast.risks.some((risk) => risk.id === 'risk-scenario-scale'));
  assert.doesNotMatch(forecast.summary, /\d+% chance/i);
});

test('produces multiple scenario-specific risks from independent scenario factors', () => {
  const forecast = createDemoForecast(
    {
      code: `function Search({ items }) {
  fetch('/api/search');
  return items.map((item) => <div key={Math.random()}>{item.name}</div>);
}`,
      language: 'typescript',
      framework: 'react',
      scenario: 'Traffic grows while the API becomes slow and the catalog reaches 100k items',
    },
    'test',
  );

  assert.ok(forecast.scenario);
  const newRisks = forecast.scenario.comparisons.filter((item) => item.status === 'new');
  assert.deepEqual(
    new Set(newRisks.map((item) => item.scenarioRiskId)),
    new Set(['risk-scenario-scale', 'risk-scenario-latency', 'risk-scenario-volume']),
  );
});

test('preserves the complete baseline so it can be restored without another request', () => {
  const request = {
    code: `function Search() { fetch('/api/search'); return <button>Search</button>; }`,
    language: 'typescript',
    framework: 'react',
  };
  const baseline = createDemoForecast(request, 'test');
  const scenarioForecast = createDemoForecast(
    { ...request, scenario: 'The API becomes slow' },
    'test',
  );

  assert.ok(scenarioForecast.scenario);
  assert.deepEqual(scenarioForecast.scenario.baseline, {
    summary: baseline.summary,
    deploymentRisk: baseline.deploymentRisk,
    scores: baseline.scores,
    signals: baseline.signals,
    risks: baseline.risks,
    preventionPlan: baseline.preventionPlan,
    disclaimer: baseline.disclaimer,
  });
});

test('detects an increased severity by normalized title and category', () => {
  const forecast = createDemoForecast(
    {
      code: `function Search() { fetch('/api/search'); return <button>Search</button>; }`,
      language: 'typescript',
      framework: 'react',
      scenario: 'The API becomes slow',
    },
    'test',
  );

  const comparison = forecast.scenario?.comparisons.find(
    (item) => item.scenarioRiskId === 'risk-fetch-errors',
  );
  assert.equal(comparison?.status, 'increased');
  assert.equal(comparison?.baselineLevel, 'high');
  assert.equal(comparison?.scenarioLevel, 'critical');
});

test('detects a decreased severity when the scenario supplies a mitigation', () => {
  const forecast = createDemoForecast(
    {
      code: `function Search() { fetch('/api/search'); return <button>Search</button>; }`,
      language: 'typescript',
      framework: 'react',
      scenario: 'Add retries and a recoverable error state',
    },
    'test',
  );

  const comparison = forecast.scenario?.comparisons.find(
    (item) => item.scenarioRiskId === 'risk-fetch-errors',
  );
  assert.equal(comparison?.status, 'decreased');
  assert.equal(comparison?.baselineLevel, 'high');
  assert.equal(comparison?.scenarioLevel, 'medium');
});

test('detects a new scenario risk that is absent from baseline', () => {
  const forecast = createDemoForecast(
    {
      code: `export function Button() { return <button>Save</button>; }`,
      language: 'typescript',
      framework: 'react',
      scenario: 'Traffic grows',
    },
    'test',
  );

  const comparison = forecast.scenario?.comparisons.find(
    (item) => item.scenarioRiskId === 'risk-scenario-scale',
  );
  assert.equal(comparison?.status, 'new');
  assert.equal(comparison?.baselineRiskId, undefined);
});

test('keeps baseline risks unchanged when the scenario has no supported risk effect', () => {
  const forecast = createDemoForecast(
    {
      code: `export function Clear() { return <div onClick={() => clear()}>Clear</div>; }`,
      language: 'typescript',
      framework: 'react',
      scenario: 'Enable dark mode for the settings page',
    },
    'test',
  );

  assert.ok(forecast.scenario);
  assert.equal(forecast.risks.length, forecast.scenario.baseline.risks.length);
  assert.ok(forecast.scenario.comparisons.length > 0);
  assert.ok(forecast.scenario.comparisons.every((item) => item.status === 'unchanged'));
});

test('matches comparison risks by normalized title plus category', () => {
  const baselineForecast = createDemoForecast(
    {
      code: `function Search() { fetch('/api/search'); return <button>Search</button>; }`,
      language: 'typescript',
      framework: 'react',
    },
    'test',
  );
  const baselineRisk = baselineForecast.risks.find((risk) => risk.id === 'risk-fetch-errors');
  assert.ok(baselineRisk);

  const [comparison] = compareForecastRisks(
    [baselineRisk],
    [{ ...baselineRisk, title: `  ${baselineRisk.title.toUpperCase()}!  ` }],
  );
  assert.equal(comparison?.status, 'unchanged');
  assert.equal(comparison?.baselineRiskId, baselineRisk.id);

  const [differentCategory] = compareForecastRisks(
    [baselineRisk],
    [{ ...baselineRisk, category: 'performance' }],
  );
  assert.equal(differentCategory?.status, 'new');
});

test('evaluates every useEffect dependency boundary independently', () => {
  const forecast = createDemoForecast(
    {
      code: `function Example() {
  useEffect(() => setReady(true), []);
  useEffect(() => setCount((count) => count + 1));
  return null;
}`,
      language: 'typescript',
      framework: 'react',
    },
    'test',
  );

  const signals = forecast.signals.filter((signal) => signal.id.startsWith('signal-effect-loop'));
  assert.equal(signals.length, 1);
  assert.equal(signals[0]?.line, 3);
});

test('evaluates an accessible name for every input independently', () => {
  const forecast = createDemoForecast(
    {
      code: `function Form() {
  return <><label htmlFor="name">Name</label>
    <input id="name" />
    <input id="email" /></>;
}`,
      language: 'typescript',
      framework: 'react',
    },
    'test',
  );

  const signals = forecast.signals.filter((signal) => signal.id.startsWith('signal-input-label'));
  assert.equal(signals.length, 1);
  assert.equal(signals[0]?.line, 4);
});

test('evaluates rejection handling for every fetch call independently', () => {
  const forecast = createDemoForecast(
    {
      code: `function load() {
  fetch('/handled').catch(reportError);
  fetch('/unhandled');
}`,
      language: 'typescript',
      framework: 'react',
    },
    'test',
  );

  const signals = forecast.signals.filter((signal) => signal.id.startsWith('signal-fetch-errors'));
  assert.equal(signals.length, 1);
  assert.equal(signals[0]?.line, 3);
});

test('reports the line of the weak-typing pattern that triggered the finding', () => {
  const forecast = createDemoForecast(
    {
      code: `type Payload = any;
export function parse(value: Payload) {
  return value;
}`,
      language: 'typescript',
      framework: 'react',
    },
    'test',
  );

  const signal = forecast.signals.find((item) => item.id === 'signal-weak-types');
  assert.equal(signal?.line, 1);
  assert.match(signal?.evidence ?? '', /any type/);
});
