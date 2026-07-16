import assert from 'node:assert/strict';
import test from 'node:test';
import { createForecast } from '../src/services/forecast-api.ts';

test('rejects a malformed successful forecast response', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => Response.json({ summary: 'Missing the required contract fields' });

  try {
    await assert.rejects(
      createForecast({
        code: 'export function Button() { return <button>Save</button>; }',
        language: 'typescript',
        framework: 'react',
      }),
      { message: 'Forecast API returned an invalid response.' },
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});
