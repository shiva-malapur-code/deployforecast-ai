import assert from 'node:assert/strict';
import test from 'node:test';
import { createApiError, createDemoForecast } from '@deploy-forecast/shared';
import { createForecast, ForecastApiError } from '../src/services/forecast-api.ts';

const request = {
  code: 'export function Button() { return <button>Save</button>; }',
  language: 'typescript' as const,
  framework: 'react' as const,
};

test('rejects a malformed successful forecast response', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => Response.json({ summary: 'Missing the required contract fields' });

  try {
    await assert.rejects(createForecast(request), {
      message: 'The forecast service returned an unusable response. Please try again.',
    });
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('aborts an in-flight forecast request', async () => {
  const controller = new AbortController();
  const pending = createForecast(request, {
    signal: controller.signal,
    fetchImpl: async (_input, init) =>
      new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener(
          'abort',
          () => reject(new DOMException('Aborted', 'AbortError')),
          { once: true },
        );
      }),
  });

  controller.abort();

  await assert.rejects(pending, (error) => {
    assert.equal(error instanceof ForecastApiError, false);
    assert.equal((error as Error).name, 'AbortError');
    return true;
  });
});

test('rejects a successful response that omits the requested scenario comparison', async () => {
  const scenarioRequest = { ...request, scenario: 'The API becomes slow' };
  const baselineOnly = createDemoForecast(request, 'test');

  await assert.rejects(
    createForecast(scenarioRequest, {
      fetchImpl: async () => Response.json(baselineOnly),
    }),
    {
      message: 'The forecast service returned an invalid scenario comparison. Please try again.',
    },
  );
});

test('maps a shared API error response without exposing provider internals', async () => {
  await assert.rejects(
    createForecast(request, {
      fetchImpl: async () =>
        Response.json(createApiError('RATE_LIMITED', 'request-123'), {
          status: 429,
          headers: { 'X-Request-ID': 'request-123' },
        }),
    }),
    (error) => {
      assert.equal(error instanceof ForecastApiError, true);
      assert.equal(error.code, 'RATE_LIMITED');
      assert.equal(error.requestId, 'request-123');
      assert.equal(error.recoverable, true);
      assert.doesNotMatch(error.message, /stack|ollama|token/i);
      return true;
    },
  );
});

test('maps network and non-contract server failures to safe client errors', async () => {
  await assert.rejects(
    createForecast(request, {
      fetchImpl: async () => {
        throw new Error('socket details that must stay private');
      },
    }),
    {
      code: 'PROVIDER_UNAVAILABLE',
      message: 'Unable to reach the forecast service. Check your connection and try again.',
    },
  );

  await assert.rejects(
    createForecast(request, {
      fetchImpl: async () => new Response('proxy failure', { status: 502 }),
    }),
    {
      code: 'INTERNAL_ERROR',
      message: 'The forecast service returned an unexpected error. Please try again.',
    },
  );
});
