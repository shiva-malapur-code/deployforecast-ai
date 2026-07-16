import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createDemoForecast,
  createDemoGeneratedTests,
  createDemoPreventiveFix,
} from '@deploy-forecast/shared';
import { ForecastApiError } from '../src/services/forecast-api.ts';
import { createGeneratedTests } from '../src/services/generated-tests-api.ts';
import { createPreventiveFix } from '../src/services/preventive-fix-api.ts';

const request = {
  code: 'export function Clear() { return <div onClick={() => clear()}>Clear</div>; }',
  language: 'typescript' as const,
  framework: 'react' as const,
};
const forecast = createDemoForecast(request, 'test');

test('accepts a valid preventive-fix API response', async () => {
  const input = { ...request, forecast };
  const expected = createDemoPreventiveFix(input, 'test');
  const result = await createPreventiveFix(input, {
    fetchImpl: async () => Response.json(expected),
  });

  assert.deepEqual(result, expected);
  assert.equal(result.originalCode, request.code);
});

test('rejects malformed and unsupported preventive-fix responses', async () => {
  const input = { ...request, forecast };
  const valid = createDemoPreventiveFix(input, 'test');

  await assert.rejects(
    createPreventiveFix(input, { fetchImpl: async () => Response.json({ improvedCode: 'short' }) }),
    { code: 'INVALID_PROVIDER_RESPONSE' },
  );
  await assert.rejects(
    createPreventiveFix(input, {
      fetchImpl: async () =>
        Response.json({
          ...valid,
          changes: [{ ...valid.changes[0], riskId: 'unsupported-risk' }],
        }),
    }),
    (error) => {
      assert.equal(error instanceof ForecastApiError, true);
      assert.match(error.message, /unsupported changes/);
      return true;
    },
  );
});

test('accepts a valid generated-tests API response', async () => {
  const input = { ...request, forecast };
  const expected = createDemoGeneratedTests(input, 'test');
  const result = await createGeneratedTests(input, {
    fetchImpl: async () => Response.json(expected),
  });

  assert.deepEqual(result, expected);
  assert.equal(result.testFramework, 'vitest');
});

test('rejects malformed and unsupported generated-test responses', async () => {
  const input = { ...request, forecast };
  const valid = createDemoGeneratedTests(input, 'test');

  await assert.rejects(
    createGeneratedTests(input, {
      fetchImpl: async () => Response.json({ ...valid, testFramework: 'jest' }),
    }),
    { code: 'INVALID_PROVIDER_RESPONSE' },
  );
  await assert.rejects(
    createGeneratedTests(input, {
      fetchImpl: async () =>
        Response.json({
          ...valid,
          strategies: [{ ...valid.strategies[0], signalIds: ['unsupported-signal'] }],
        }),
    }),
    (error) => {
      assert.equal(error instanceof ForecastApiError, true);
      assert.match(error.message, /unsupported strategies/);
      return true;
    },
  );
});
