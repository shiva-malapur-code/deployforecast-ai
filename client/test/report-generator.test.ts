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
