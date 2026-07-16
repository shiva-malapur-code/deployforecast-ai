import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createDemoForecast,
  type EngineeringForecast,
  type ForecastRequest,
} from '@deploy-forecast/shared';
import { ForecastApiError } from '../src/services/forecast-api.ts';
import { ForecastRequestManager } from '../src/services/forecast-request-manager.ts';

const firstRequest: ForecastRequest = {
  code: 'export function First() { return <button>First</button>; }',
  language: 'typescript',
  framework: 'react',
};
const secondRequest: ForecastRequest = {
  ...firstRequest,
  code: 'export function Second() { return <button>Second</button>; }',
};

test('cancels the previous request and ignores its stale response', async () => {
  const pending = new Map<string, (forecast: EngineeringForecast) => void>();
  const aborted: string[] = [];
  const manager = new ForecastRequestManager((request, options) => {
    options?.signal?.addEventListener('abort', () => aborted.push(request.code), { once: true });
    return new Promise((resolve) => pending.set(request.code, resolve));
  });

  const first = manager.start(firstRequest);
  const second = manager.start(secondRequest);
  pending.get(firstRequest.code)?.(createDemoForecast(firstRequest, 'test'));
  pending.get(secondRequest.code)?.(createDemoForecast(secondRequest, 'test'));

  assert.equal((await first).status, 'stale');
  assert.equal((await second).status, 'success');
  assert.deepEqual(aborted, [firstRequest.code]);
});

test('prevents duplicate in-flight submissions', async () => {
  let calls = 0;
  let resolveForecast: ((forecast: EngineeringForecast) => void) | undefined;
  const manager = new ForecastRequestManager(() => {
    calls += 1;
    return new Promise((resolve) => {
      resolveForecast = resolve;
    });
  });

  const first = manager.start(firstRequest);
  const duplicate = await manager.start(firstRequest);
  assert.equal(duplicate.status, 'duplicate');
  assert.equal(calls, 1);

  resolveForecast?.(createDemoForecast(firstRequest, 'test'));
  assert.equal((await first).status, 'success');
});

test('allows a failed recoverable request to be retried', async () => {
  let calls = 0;
  const manager = new ForecastRequestManager(async (request) => {
    calls += 1;
    if (calls === 1) {
      throw new ForecastApiError('Temporary provider failure.', 'PROVIDER_UNAVAILABLE', true);
    }
    return createDemoForecast(request, 'test');
  });

  await assert.rejects(manager.start(firstRequest), { name: 'ForecastApiError' });
  const retried = await manager.start(firstRequest);

  assert.equal(retried.status, 'success');
  assert.equal(calls, 2);
});

test('treats the same code with a changed scenario as a new request and restores only the latest result', async () => {
  const pending = new Map<string, (forecast: EngineeringForecast) => void>();
  const manager = new ForecastRequestManager(
    (request) => new Promise((resolve) => pending.set(request.scenario ?? 'baseline', resolve)),
  );
  const baselineScenario = { ...firstRequest, scenario: 'Traffic grows' };
  const changedScenario = { ...firstRequest, scenario: 'The API becomes slow' };

  const first = manager.start(baselineScenario);
  const second = manager.start(changedScenario);
  pending.get('Traffic grows')?.(createDemoForecast(baselineScenario, 'test'));
  pending.get('The API becomes slow')?.(createDemoForecast(changedScenario, 'test'));

  assert.equal((await first).status, 'stale');
  const latest = await second;
  assert.equal(latest.status, 'success');
  if (latest.status === 'success') {
    assert.equal(latest.submission.request.scenario, 'The API becomes slow');
  }
});

test('ignores a late rejection from an aborted stale request', async () => {
  let rejectFirst: ((error: Error) => void) | undefined;
  const manager = new ForecastRequestManager((request) => {
    if (request.code === firstRequest.code) {
      return new Promise((_resolve, reject) => {
        rejectFirst = reject;
      });
    }
    return Promise.resolve(createDemoForecast(request, 'test'));
  });

  const first = manager.start(firstRequest);
  const second = manager.start(secondRequest);
  rejectFirst?.(new Error('late stale failure'));

  assert.equal((await first).status, 'stale');
  assert.equal((await second).status, 'success');
});

test('manual abort clears the active request and returns a stale outcome', async () => {
  const manager = new ForecastRequestManager(
    (_request, options) =>
      new Promise((_resolve, reject) => {
        options?.signal?.addEventListener(
          'abort',
          () => reject(new DOMException('Aborted', 'AbortError')),
          { once: true },
        );
      }),
  );

  const pending = manager.start(firstRequest);
  manager.abort();

  assert.equal((await pending).status, 'stale');
  assert.equal(manager.isRunning, false);
});
