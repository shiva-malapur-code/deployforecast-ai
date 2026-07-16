import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createDemoForecast,
  createDemoGeneratedTests,
  EngineeringForecastSchema,
  validateScenarioForecast,
} from '@deploy-forecast/shared';
import { MockProvider } from '../dist/providers/mock-provider.js';
import { OllamaProvider } from '../dist/providers/ollama-provider.js';

const request = {
  code: `function Search() { fetch('/api/search'); return <button>Search</button>; }`,
  language: 'typescript',
  framework: 'react',
};

test('mock provider returns a validated multi-risk scenario forecast', async () => {
  const input = {
    ...request,
    scenario: 'Traffic grows while the API becomes slow and the catalog reaches 100k items',
  };
  const forecast = await new MockProvider().forecast(input);

  assert.equal(EngineeringForecastSchema.safeParse(forecast).success, true);
  assert.equal(validateScenarioForecast(forecast, input), true);
  assert.ok(
    (forecast.scenario?.comparisons.filter((item) => item.status === 'new').length ?? 0) > 1,
  );
});

test('mock provider honors forecast cancellation', async () => {
  const controller = new AbortController();
  const pending = new MockProvider().forecast(request, controller.signal);
  controller.abort(new DOMException('Aborted', 'AbortError'));

  await assert.rejects(pending, { name: 'AbortError' });
});

test('Ollama provider accepts a valid structured forecast and stamps its provider identity', async () => {
  const modelForecast = createDemoForecast(request, 'model-output');
  const provider = new OllamaProvider(async () =>
    Response.json({ response: JSON.stringify(modelForecast) }),
  );
  const forecast = await provider.forecast(request);

  assert.equal(EngineeringForecastSchema.safeParse(forecast).success, true);
  assert.match(forecast.provider, /^ollama:/);
  assert.notEqual(forecast.provider, modelForecast.provider);
});

test('Ollama provider maps non-success HTTP responses to provider unavailability', async () => {
  const provider = new OllamaProvider(async () => new Response('Unavailable', { status: 503 }));

  await assert.rejects(provider.forecast(request), { name: 'ProviderUnavailableError' });
});

test('Ollama provider rejects a malformed response envelope', async () => {
  const provider = new OllamaProvider(async () => Response.json({ output: '{}' }));

  await assert.rejects(provider.forecast(request), { name: 'ProviderOutputError' });
});

test('Ollama provider rejects generated tests that reference unsupported evidence', async () => {
  const input = { ...request, forecast: createDemoForecast(request, 'test') };
  const generated = createDemoGeneratedTests(input, 'model-output');
  const invalid = {
    ...generated,
    strategies: generated.strategies.map((strategy, index) =>
      index === 0 ? { ...strategy, signalIds: ['missing-signal'] } : strategy,
    ),
  };
  const provider = new OllamaProvider(async () =>
    Response.json({ response: JSON.stringify(invalid) }),
  );

  await assert.rejects(provider.generateTests(input), { name: 'ProviderOutputError' });
});
