import assert from 'node:assert/strict';
import test from 'node:test';
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
