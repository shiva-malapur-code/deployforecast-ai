import assert from 'node:assert/strict';
import test from 'node:test';
import { createDemoForecast } from '@deploy-forecast/shared';
import { createForecastReport } from '../src/utils/report-generator.ts';

test('includes the security score in downloaded report content', () => {
  const forecast = createDemoForecast(
    {
      code: 'export function Button() { return <button>Save</button>; }',
      language: 'typescript',
      framework: 'react',
    },
    'test',
  );

  assert.match(createForecastReport(forecast, 'const value = true;', ''), /- Security: 100\/100/);
});

test('includes scenario comparison, assumptions, limitations, and baseline in the report', () => {
  const scenario = 'The API becomes slow';
  const code = `function Search() { fetch('/api/search'); return <button>Search</button>; }`;
  const forecast = createDemoForecast(
    { code, language: 'typescript', framework: 'react', scenario },
    'test',
  );
  const report = createForecastReport(forecast, code, scenario);

  assert.match(report, /## Scenario forecast comparison/);
  assert.match(report, /### Assumptions/);
  assert.match(report, /### Limitations/);
  assert.match(report, /### Preserved baseline/);
  assert.match(report, /increased/);
});

test('includes evidence lines, prevention actions, and analyzed source', () => {
  const code = `export function Clear() {
  return <div onClick={() => clear()}>Clear</div>;
}`;
  const forecast = createDemoForecast({ code, language: 'typescript', framework: 'react' }, 'test');
  const report = createForecastReport(forecast, code, '');

  assert.match(report, /line 2/);
  assert.match(report, /Use a semantic button/);
  assert.match(report, /## Prevention plan/);
  assert.match(report, /```tsx[\s\S]*export function Clear/);
  assert.match(report, /Scenario: Standard production deployment/);
});

test('renders a safe no-risks report fallback with every score', () => {
  const code = 'export function Button() { return <button>Save</button>; }';
  const forecast = createDemoForecast({ code, language: 'typescript', framework: 'react' }, 'test');
  const report = createForecastReport(forecast, code, '');

  for (const score of [
    'Health',
    'Reliability',
    'Performance',
    'Accessibility',
    'Security',
    'Maintainability',
  ]) {
    assert.match(report, new RegExp(`- ${score}: 100/100`));
  }
  assert.match(report, /No risks matched the current inspection rules/);
});
