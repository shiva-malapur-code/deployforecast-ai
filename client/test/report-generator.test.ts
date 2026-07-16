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
