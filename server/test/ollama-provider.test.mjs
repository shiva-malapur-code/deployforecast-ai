import assert from 'node:assert/strict';
import test from 'node:test';
import { createDemoForecast } from '@deploy-forecast/shared';
import { OllamaProvider } from '../dist/providers/ollama-provider.js';

const request = {
  code: 'export function Button() { return <button>Save</button>; }',
  language: 'typescript',
  framework: 'react',
};

test('returns a controlled error for malformed Ollama output', async () => {
  const provider = new OllamaProvider(async () => Response.json({ response: '{not valid json' }));

  await assert.rejects(provider.forecast(request), (error) => {
    assert.equal(error.name, 'ProviderOutputError');
    assert.equal(error.message, 'AI provider returned an invalid response.');
    return true;
  });
});

test('rejects Ollama output that drops a requested scenario comparison', async () => {
  const baselineOnly = createDemoForecast(request, 'test');
  const provider = new OllamaProvider(async () =>
    Response.json({ response: JSON.stringify(baselineOnly) }),
  );

  await assert.rejects(provider.forecast({ ...request, scenario: 'The API becomes slow' }), {
    name: 'ProviderOutputError',
  });
});

test('rejects invalid preventive-fix provider output', async () => {
  const provider = new OllamaProvider(async () =>
    Response.json({ response: JSON.stringify({ improvedCode: request.code }) }),
  );

  await assert.rejects(
    provider.generatePreventiveFix({
      ...request,
      forecast: createDemoForecast(request, 'test'),
    }),
    { name: 'ProviderOutputError' },
  );
});

test('rejects malformed generated-test provider output', async () => {
  const provider = new OllamaProvider(async () =>
    Response.json({ response: JSON.stringify({ testFramework: 'jest', testCode: 'test()' }) }),
  );

  await assert.rejects(
    provider.generateTests({
      ...request,
      forecast: createDemoForecast(request, 'test'),
    }),
    { name: 'ProviderOutputError' },
  );
});
