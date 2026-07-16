import assert from 'node:assert/strict';
import test from 'node:test';
import { ApiErrorSchema, createDemoForecast, PreventiveFixSchema } from '@deploy-forecast/shared';
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
  const payload = await response.json();
  assert.equal(payload.code, 'INVALID_PROVIDER_RESPONSE');
  assert.equal(payload.recoverable, true);
  assert.equal(typeof payload.requestId, 'string');
  assert.equal(response.headers.get('X-Request-ID'), payload.requestId);
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
  assert.equal(payload.code, 'INVALID_REQUEST');
  assert.equal(response.headers.get('X-Request-ID'), payload.requestId);
});

test('returns the shared provider-timeout error contract', async () => {
  const worker = createWorkerHandler(
    (_input, signal) =>
      new Promise((_resolve, reject) => {
        signal.addEventListener('abort', () => reject(signal.reason), { once: true });
      }),
    { providerTimeoutMs: 5, requestTimeoutMs: 50 },
  );
  const response = await worker.fetch(
    new Request('https://example.test/api/forecast', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
    }),
    { ASSETS: unusedAssets },
  );
  const payload = await response.json();

  assert.equal(response.status, 504);
  assert.equal(payload.code, 'PROVIDER_TIMEOUT');
  assert.equal(ApiErrorSchema.safeParse(payload).success, true);
});

test('serves a validated preventive fix from the dedicated endpoint', async () => {
  const forecast = createDemoForecast(requestBody, 'test');
  const worker = createWorkerHandler();
  const response = await worker.fetch(
    new Request('https://example.test/api/preventive-fix', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...requestBody, forecast }),
    }),
    { ASSETS: unusedAssets },
  );
  const payload = await response.json();

  assert.equal(response.status, 200);
  assert.equal(PreventiveFixSchema.safeParse(payload).success, true);
  assert.equal(payload.originalCode, requestBody.code);
});

test('rejects malformed preventive-fix provider output', async () => {
  const forecast = createDemoForecast(requestBody, 'test');
  const worker = createWorkerHandler(undefined, {
    preventiveFixFactory: async () => ({ improvedCode: requestBody.code }),
  });
  const response = await worker.fetch(
    new Request('https://example.test/api/preventive-fix', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...requestBody, forecast }),
    }),
    { ASSETS: unusedAssets },
  );
  const payload = await response.json();

  assert.equal(response.status, 502);
  assert.equal(payload.code, 'INVALID_PROVIDER_RESPONSE');
});
