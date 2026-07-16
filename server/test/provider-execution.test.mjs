import assert from 'node:assert/strict';
import test from 'node:test';
import { executeProviderForecast } from '../dist/provider-execution.js';

const request = {
  code: 'export function Button() { return <button>Save</button>; }',
  language: 'typescript',
  framework: 'react',
};

test('aborts and maps a provider that exceeds its timeout', async () => {
  let aborted = false;
  const provider = {
    name: 'slow-test-provider',
    forecast: (_input, signal) =>
      new Promise((_resolve, reject) => {
        signal.addEventListener(
          'abort',
          () => {
            aborted = true;
            reject(signal.reason);
          },
          { once: true },
        );
      }),
  };

  await assert.rejects(
    executeProviderForecast(provider, request, {
      providerTimeoutMs: 5,
      requestTimeoutMs: 50,
    }),
    { name: 'ProviderTimeoutError' },
  );
  assert.equal(aborted, true);
});
