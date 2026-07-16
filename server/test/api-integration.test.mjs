import assert from 'node:assert/strict';
import test from 'node:test';
import {
  ApiErrorSchema,
  createDemoForecast,
  EngineeringForecastSchema,
  GeneratedTestsSchema,
  PreventiveFixSchema,
} from '@deploy-forecast/shared';
import { app } from '../dist/app.js';
import { requestApp } from './http-harness.mjs';

const requestBody = {
  code: 'export function Clear() { return <div onClick={() => clear()}>Clear</div>; }',
  language: 'typescript',
  framework: 'react',
};

test('GET /api/health returns a request ID and security headers', async () => {
  const response = await requestApp(app, { path: '/api/health' });

  assert.equal(response.status, 200);
  assert.deepEqual(response.json(), { status: 'ok' });
  assert.equal(typeof response.headers['x-request-id'], 'string');
  assert.equal(response.headers['x-content-type-options'], 'nosniff');
});

test('POST /api/forecast returns a validated scenario forecast', async () => {
  const response = await requestApp(app, {
    method: 'POST',
    path: '/api/forecast',
    body: { ...requestBody, scenario: 'The API becomes slow' },
  });
  const payload = response.json();

  assert.equal(response.status, 200);
  assert.equal(EngineeringForecastSchema.safeParse(payload).success, true);
  assert.equal(payload.scenario.label, 'Scenario forecast');
});

test('POST /api/forecast rejects invalid and malformed JSON through the shared error contract', async () => {
  const invalid = await requestApp(app, {
    method: 'POST',
    path: '/api/forecast',
    body: { ...requestBody, code: 'short' },
  });
  const malformed = await requestApp(app, {
    method: 'POST',
    path: '/api/forecast',
    body: '{invalid json',
  });

  for (const response of [invalid, malformed]) {
    const payload = response.json();
    assert.equal(response.status, 400);
    assert.equal(ApiErrorSchema.safeParse(payload).success, true);
    assert.equal(payload.code, 'INVALID_REQUEST');
    assert.equal(response.headers['x-request-id'], payload.requestId);
  }
});

test('POST /api/preventive-fix returns an evidence-linked validated response', async () => {
  const forecast = createDemoForecast(requestBody, 'integration');
  const response = await requestApp(app, {
    method: 'POST',
    path: '/api/preventive-fix',
    body: { ...requestBody, forecast },
  });
  const payload = response.json();

  assert.equal(response.status, 200);
  assert.equal(PreventiveFixSchema.safeParse(payload).success, true);
  assert.equal(payload.originalCode, requestBody.code);
  assert.ok(payload.changes.length > 0);
});

test('POST /api/generated-tests returns a validated forecast-linked suite', async () => {
  const forecast = createDemoForecast(requestBody, 'integration');
  const response = await requestApp(app, {
    method: 'POST',
    path: '/api/generated-tests',
    body: { ...requestBody, forecast },
  });
  const payload = response.json();

  assert.equal(response.status, 200);
  assert.equal(GeneratedTestsSchema.safeParse(payload).success, true);
  assert.equal(payload.testFramework, 'vitest');
  assert.ok(payload.strategies.length > 0);
});

test('unknown Express routes return the shared not-found contract', async () => {
  const response = await requestApp(app, { path: '/api/unknown' });
  const payload = response.json();

  assert.equal(response.status, 404);
  assert.equal(ApiErrorSchema.safeParse(payload).success, true);
  assert.equal(payload.code, 'NOT_FOUND');
});
