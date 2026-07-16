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
