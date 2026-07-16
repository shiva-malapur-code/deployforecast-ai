import assert from 'node:assert/strict';
import test from 'node:test';
import {
  ApiErrorSchema,
  createApiError,
  createDemoForecast,
  createDemoGeneratedTests,
  createDemoPreventiveFix,
  EngineeringForecastSchema,
  ForecastRequestSchema,
  GeneratedTestsSchema,
  PreventiveFixSchema,
  validateScenarioForecast,
  validatePreventiveFixEvidence,
  validateGeneratedTestEvidence,
} from '../dist/index.js';

const validRequest = {
  code: 'export function Button() { return <button>Save</button>; }',
  language: 'typescript',
  framework: 'react',
};

test('accepts a valid forecast request', () => {
  assert.deepEqual(ForecastRequestSchema.parse(validRequest), validRequest);
});

test('rejects an invalid forecast request', () => {
  assert.equal(
    ForecastRequestSchema.safeParse({ ...validRequest, code: 'too short' }).success,
    false,
  );
});

test('accepts a valid forecast response including a security score', () => {
  const forecast = createDemoForecast(validRequest, 'test');
  const result = EngineeringForecastSchema.safeParse(forecast);

  assert.equal(result.success, true);
  assert.equal(typeof forecast.scores.security, 'number');
});

test('accepts and validates a scenario forecast with its preserved baseline', () => {
  const input = { ...validRequest, scenario: 'The API becomes slow' };
  const forecast = createDemoForecast(input, 'test');

  assert.equal(EngineeringForecastSchema.safeParse(forecast).success, true);
  assert.equal(validateScenarioForecast(forecast, input), true);
  assert.equal(forecast.scenario?.label, 'Scenario forecast');
});

test('rejects a forecast with an invalid score', () => {
  const forecast = createDemoForecast(validRequest, 'test');
  const result = EngineeringForecastSchema.safeParse({
    ...forecast,
    scores: { ...forecast.scores, security: 101 },
  });

  assert.equal(result.success, false);
});

test('rejects a forecast with an invalid risk category', () => {
  const forecast = createDemoForecast({ ...validRequest, scenario: 'Traffic grows 10×' }, 'test');
  const [risk, ...remainingRisks] = forecast.risks;
  assert.ok(risk);

  const result = EngineeringForecastSchema.safeParse({
    ...forecast,
    risks: [{ ...risk, category: 'operations' }, ...remainingRisks],
  });

  assert.equal(result.success, false);
});

test('creates a provider-safe structured API error', () => {
  const error = createApiError('PROVIDER_TIMEOUT', 'request-123');

  assert.equal(ApiErrorSchema.safeParse(error).success, true);
  assert.equal(error.recoverable, true);
  assert.equal(error.requestId, 'request-123');
});

test('creates an evidence-linked preventive fix while preserving original code', () => {
  const request = {
    ...validRequest,
    code: 'export function Clear() { return <div onClick={() => clear()}>Clear</div>; }',
  };
  const input = { ...request, forecast: createDemoForecast(request, 'test') };
  const fix = createDemoPreventiveFix(input, 'test');

  assert.equal(PreventiveFixSchema.safeParse(fix).success, true);
  assert.equal(fix.originalCode, request.code);
  assert.notEqual(fix.improvedCode, request.code);
  assert.equal(validatePreventiveFixEvidence(fix, input), true);
});

test('creates a validated generated test suite linked to forecast evidence', () => {
  const request = {
    ...validRequest,
    code: 'export function Clear() { return <div onClick={() => clear()}>Clear</div>; }',
  };
  const input = { ...request, forecast: createDemoForecast(request, 'test') };
  const generated = createDemoGeneratedTests(input, 'test');

  assert.equal(GeneratedTestsSchema.safeParse(generated).success, true);
  assert.match(generated.testCode, /from 'vitest'/);
  assert.match(generated.testCode, /from '@testing-library\/react'/);
  assert.equal(validateGeneratedTestEvidence(generated, input), true);
});
