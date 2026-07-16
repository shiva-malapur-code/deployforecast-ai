import assert from 'node:assert/strict';
import test from 'node:test';
import { createDemoForecast } from '../dist/index.js';

const baseRequest = {
  language: 'typescript',
  framework: 'react',
};

test('returns perfect category scores and low deployment risk when no rule matches', () => {
  const forecast = createDemoForecast(
    { ...baseRequest, code: 'export function Button() { return <button>Save</button>; }' },
    'test',
  );

  assert.deepEqual(forecast.scores, {
    health: 100,
    reliability: 100,
    performance: 100,
    accessibility: 100,
    security: 100,
    maintainability: 100,
  });
  assert.equal(forecast.deploymentRisk, 'low');
});

test('caps health at 59 when any critical risk is present', () => {
  const forecast = createDemoForecast(
    {
      ...baseRequest,
      code: `export function Content({ html }) { return <main dangerouslySetInnerHTML={{ __html: html }} />; }`,
    },
    'test',
  );

  assert.equal(forecast.deploymentRisk, 'critical');
  assert.equal(forecast.scores.security, 74);
  assert.equal(forecast.scores.health, 59);
});

test('floors a heavily penalized category score at 28', () => {
  const inputs = Array.from({ length: 10 }, (_, index) => `<input id="field-${index}" />`).join('');
  const forecast = createDemoForecast(
    { ...baseRequest, code: `export function Form() { return <form>${inputs}</form>; }` },
    'test',
  );

  assert.equal(forecast.scores.accessibility, 28);
  assert.equal(forecast.risks.filter((risk) => risk.category === 'accessibility').length, 10);
});

test('uses the most severe risk for deployment risk regardless of category', () => {
  const forecast = createDemoForecast(
    {
      ...baseRequest,
      code: `function Search() {
  useEffect(() => { fetch('/api/search'); });
  return <div onClick={() => clear()}>Clear</div>;
}`,
    },
    'test',
  );

  assert.equal(forecast.deploymentRisk, 'critical');
  assert.equal(forecast.risks[0]?.level, 'critical');
  assert.ok(forecast.scores.reliability < forecast.scores.accessibility);
});

test('keeps baseline scores immutable while recalculating scenario scores', () => {
  const request = {
    ...baseRequest,
    code: `function Search() { fetch('/api/search'); return <button>Search</button>; }`,
  };
  const baseline = createDemoForecast(request, 'test');
  const scenario = createDemoForecast({ ...request, scenario: 'The API becomes slow' }, 'test');

  assert.deepEqual(scenario.scenario?.baseline.scores, baseline.scores);
  assert.ok(scenario.scores.reliability < baseline.scores.reliability);
  assert.equal(scenario.scenario?.baseline.deploymentRisk, baseline.deploymentRisk);
});
