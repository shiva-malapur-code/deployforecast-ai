import assert from 'node:assert/strict';
import test from 'node:test';
import {
  ApiErrorSchema,
  createDemoForecast,
  GeneratedTestsSchema,
  PreventiveFixSchema,
} from '@deploy-forecast/shared';
import { createWorkerHandler } from '../../dist/server/index.js';

const requestBody = {
  code: 'export function Button() { return <button>Save</button>; }',
  language: 'typescript',
  framework: 'react',
};

const unusedAssets = {
  fetch: async () => new Response('Not found', { status: 404 }),
};

test('serves worker health with a request ID', async () => {
  const response = await createWorkerHandler().fetch(
    new Request('https://example.test/api/health'),
    { ASSETS: unusedAssets },
  );

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { status: 'ok' });
  assert.equal(typeof response.headers.get('X-Request-ID'), 'string');
});

test('serves a validated multi-risk scenario forecast from the hosted endpoint', async () => {
  const scenario = 'Traffic grows while the API becomes slow and the catalog reaches 100k items';
  const response = await createWorkerHandler().fetch(
    new Request('https://example.test/api/forecast', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...requestBody, scenario }),
    }),
    { ASSETS: unusedAssets },
  );
  const payload = await response.json();

  assert.equal(response.status, 200);
  assert.equal(payload.scenario.input, scenario);
  assert.ok(payload.scenario.comparisons.filter((item) => item.status === 'new').length > 1);
});

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

test('rejects a hosted forecast that omits a requested scenario comparison', async () => {
  const worker = createWorkerHandler(() => createDemoForecast(requestBody, 'test'));
  const response = await worker.fetch(
    new Request('https://example.test/api/forecast', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...requestBody, scenario: 'The API becomes slow' }),
    }),
    { ASSETS: unusedAssets },
  );
  const payload = await response.json();

  assert.equal(response.status, 502);
  assert.equal(payload.code, 'INVALID_PROVIDER_RESPONSE');
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

test('returns the shared request-timeout error contract', async () => {
  const worker = createWorkerHandler(
    (_input, signal) =>
      new Promise((_resolve, reject) => {
        signal.addEventListener('abort', () => reject(signal.reason), { once: true });
      }),
    { providerTimeoutMs: 50, requestTimeoutMs: 5 },
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
  assert.equal(payload.code, 'REQUEST_TIMEOUT');
  assert.equal(ApiErrorSchema.safeParse(payload).success, true);
});

test('rate limits hosted API calls with the shared contract', async () => {
  const worker = createWorkerHandler(undefined, { rateLimitMax: 1 });
  const createRequest = () =>
    new Request('https://example.test/api/forecast', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'CF-Connecting-IP': '203.0.113.7' },
      body: JSON.stringify(requestBody),
    });

  assert.equal((await worker.fetch(createRequest(), { ASSETS: unusedAssets })).status, 200);
  const limited = await worker.fetch(createRequest(), { ASSETS: unusedAssets });
  const payload = await limited.json();

  assert.equal(limited.status, 429);
  assert.equal(payload.code, 'RATE_LIMITED');
  assert.equal(ApiErrorSchema.safeParse(payload).success, true);
});

test('rejects malformed JSON consistently across hosted POST endpoints', async () => {
  for (const path of ['/api/forecast', '/api/preventive-fix', '/api/generated-tests']) {
    const response = await createWorkerHandler().fetch(
      new Request(`https://example.test${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{invalid json',
      }),
      { ASSETS: unusedAssets },
    );
    const payload = await response.json();

    assert.equal(response.status, 400);
    assert.equal(payload.code, 'INVALID_REQUEST');
    assert.equal(ApiErrorSchema.safeParse(payload).success, true);
  }
});

test('serves static assets and falls back to the application shell', async () => {
  const assets = {
    fetch: async (request) => {
      const path = new URL(request.url).pathname;
      if (path === '/assets/app.js') return new Response('asset', { status: 200 });
      if (path === '/index.html') return new Response('<main>app shell</main>', { status: 200 });
      return new Response('Not found', { status: 404 });
    },
  };
  const worker = createWorkerHandler();

  const asset = await worker.fetch(new Request('https://example.test/assets/app.js'), {
    ASSETS: assets,
  });
  const shell = await worker.fetch(new Request('https://example.test/review/123'), {
    ASSETS: assets,
  });

  assert.equal(await asset.text(), 'asset');
  assert.equal(await shell.text(), '<main>app shell</main>');
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

test('serves validated generated tests from the dedicated endpoint', async () => {
  const generatedRequest = {
    ...requestBody,
    code: 'export function Clear() { return <div onClick={() => clear()}>Clear</div>; }',
  };
  const forecast = createDemoForecast(generatedRequest, 'test');
  const worker = createWorkerHandler();
  const response = await worker.fetch(
    new Request('https://example.test/api/generated-tests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...generatedRequest, forecast }),
    }),
    { ASSETS: unusedAssets },
  );
  const payload = await response.json();

  assert.equal(response.status, 200);
  assert.equal(GeneratedTestsSchema.safeParse(payload).success, true);
  assert.match(payload.testCode, /@testing-library\/react/);
});

test('rejects malformed generated-test provider output', async () => {
  const forecast = createDemoForecast(requestBody, 'test');
  const worker = createWorkerHandler(undefined, {
    generatedTestsFactory: async () => ({ testFramework: 'jest', testCode: 'test()' }),
  });
  const response = await worker.fetch(
    new Request('https://example.test/api/generated-tests', {
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
