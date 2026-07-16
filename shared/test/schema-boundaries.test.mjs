import assert from 'node:assert/strict';
import test from 'node:test';
import {
  ApiErrorSchema,
  createDemoForecast,
  createDemoGeneratedTests,
  createDemoPreventiveFix,
  ForecastRequestSchema,
  ForecastSignalSchema,
  GeneratedTestsSchema,
  PreventiveFixSchema,
  ScenarioForecastSchema,
  validateGeneratedTestEvidence,
  validatePreventiveFixEvidence,
  validateScenarioForecast,
} from '../dist/index.js';

const validRequest = {
  code: 'export function Button() { return <button>Save</button>; }',
  language: 'typescript',
  framework: 'react',
};

test('applies request defaults and accepts boundary-sized source and scenario input', () => {
  const parsed = ForecastRequestSchema.parse({
    code: 'x'.repeat(50_000),
    scenario: 's'.repeat(500),
  });

  assert.equal(parsed.language, 'typescript');
  assert.equal(parsed.framework, 'react');
  assert.equal(parsed.code.length, 50_000);
  assert.equal(parsed.scenario?.length, 500);
});

test('rejects request values outside source, scenario, language, and framework boundaries', () => {
  assert.equal(ForecastRequestSchema.safeParse({ code: 'x'.repeat(19) }).success, false);
  assert.equal(ForecastRequestSchema.safeParse({ code: 'x'.repeat(50_001) }).success, false);
  assert.equal(
    ForecastRequestSchema.safeParse({ ...validRequest, scenario: 's'.repeat(501) }).success,
    false,
  );
  assert.equal(
    ForecastRequestSchema.safeParse({ ...validRequest, language: 'python' }).success,
    false,
  );
  assert.equal(
    ForecastRequestSchema.safeParse({ ...validRequest, framework: 'vue' }).success,
    false,
  );
});

test('rejects invalid signal line numbers and malformed API errors', () => {
  assert.equal(
    ForecastSignalSchema.safeParse({ id: 'signal', title: 'Signal', evidence: 'Evidence', line: 0 })
      .success,
    false,
  );
  assert.equal(
    ApiErrorSchema.safeParse({
      error: 'Bad request',
      code: 'NOT_A_REAL_CODE',
      requestId: '',
      recoverable: 'yes',
    }).success,
    false,
  );
});

test('rejects malformed scenario labels and comparison methods', () => {
  const forecast = createDemoForecast({ ...validRequest, scenario: 'Traffic grows' }, 'test');
  assert.ok(forecast.scenario);

  assert.equal(
    ScenarioForecastSchema.safeParse({ ...forecast.scenario, label: 'Baseline forecast' }).success,
    false,
  );
  assert.equal(
    ScenarioForecastSchema.safeParse({ ...forecast.scenario, comparisonMethod: 'risk-id' }).success,
    false,
  );
  assert.equal(
    validateScenarioForecast(
      { ...forecast, scenario: { ...forecast.scenario, input: 'Different scenario' } },
      { ...validRequest, scenario: 'Traffic grows' },
    ),
    false,
  );
});

test('validates preventive-fix source preservation and evidence references', () => {
  const request = {
    ...validRequest,
    code: 'export function Clear() { return <div onClick={() => clear()}>Clear</div>; }',
  };
  const input = { ...request, forecast: createDemoForecast(request, 'test') };
  const fix = createDemoPreventiveFix(input, 'test');

  assert.equal(PreventiveFixSchema.safeParse(fix).success, true);
  assert.equal(
    validatePreventiveFixEvidence({ ...fix, originalCode: validRequest.code }, input),
    false,
  );
  assert.equal(
    validatePreventiveFixEvidence(
      { ...fix, changes: [{ ...fix.changes[0], riskId: 'missing-risk' }] },
      input,
    ),
    false,
  );
});

test('validates generated-test framework and evidence references', () => {
  const request = {
    ...validRequest,
    code: 'export function Clear() { return <div onClick={() => clear()}>Clear</div>; }',
  };
  const input = { ...request, forecast: createDemoForecast(request, 'test') };
  const generated = createDemoGeneratedTests(input, 'test');

  assert.equal(
    GeneratedTestsSchema.safeParse({ ...generated, testFramework: 'jest' }).success,
    false,
  );
  assert.equal(
    validateGeneratedTestEvidence(
      {
        ...generated,
        strategies: [{ ...generated.strategies[0], signalIds: ['missing-signal'] }],
      },
      input,
    ),
    false,
  );
});
