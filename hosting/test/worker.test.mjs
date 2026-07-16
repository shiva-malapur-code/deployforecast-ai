import assert from 'node:assert/strict';
import test from 'node:test';
import { ApiErrorSchema } from '@deploy-forecast/shared';
import { createWorkerHandler } from '../../dist/server/index.js';

const requestBody = {
  code: 'export function Button() { return <button>Save</button>; }',
  language: 'typescript',
  framework: 'react',
};

const unusedAssets = {
  fetch: async () => new Response('Not found', { status: 404 }),
};

test('returns a controlled error for a malformed hosted forecast response', async () => {
  const worker = createWorkerHandler(async () => ({ summary: 'Malformed output' }));
  const response = await worker.fetch(
    new Request('https://example.test/api/forecast', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
    }),
    { ASSETS: unusedAssets },
  );

  assert.equal(response.status, 502);
  assert.deepEqual(await response.json(), {
    error: 'Forecast provider returned an invalid response.',
  });
});

test('uses the shared request and error contracts for invalid hosted requests', async () => {
  const worker = createWorkerHandler();
  const response = await worker.fetch(
    new Request('https://example.test/api/forecast', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...requestBody, code: 'too short' }),
    }),
    { ASSETS: unusedAssets },
  );
  const payload = await response.json();

  assert.equal(response.status, 400);
  assert.equal(ApiErrorSchema.safeParse(payload).success, true);
  assert.equal(payload.error, 'Invalid forecast request');
});
