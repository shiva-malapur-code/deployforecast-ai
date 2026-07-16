import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createDemoForecast,
  EngineeringForecastSchema,
  ForecastRequestSchema,
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
