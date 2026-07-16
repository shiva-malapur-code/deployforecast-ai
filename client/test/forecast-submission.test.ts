import assert from 'node:assert/strict';
import test from 'node:test';
import { createDemoForecast, type ForecastRequest } from '@deploy-forecast/shared';
import { submitForecast } from '../src/services/forecast-submission.ts';

test('associates a forecast with an immutable submitted request snapshot', async () => {
  const input: ForecastRequest = {
    code: 'export function Button() { return <button>Save</button>; }',
    language: 'typescript',
    framework: 'react',
    scenario: 'Traffic grows 10×',
  };

  const pending = submitForecast(input, async (request) => {
    await Promise.resolve();
    return createDemoForecast(request, 'test');
  });
  input.code = 'export function Changed() { return <div>Changed</div>; }';
  input.scenario = 'The API becomes slow';

  const submission = await pending;
  assert.equal(
    submission.request.code,
    'export function Button() { return <button>Save</button>; }',
  );
  assert.equal(submission.request.scenario, 'Traffic grows 10×');
  assert.equal(Object.isFrozen(submission.request), true);
});
