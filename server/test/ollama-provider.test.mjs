import assert from 'node:assert/strict';
import test from 'node:test';
import { OllamaProvider } from '../dist/providers/ollama-provider.js';

test('returns a controlled error for malformed Ollama output', async () => {
  const provider = new OllamaProvider(async () => Response.json({ response: '{not valid json' }));

  await assert.rejects(
    provider.forecast({
      code: 'export function Button() { return <button>Save</button>; }',
      language: 'typescript',
      framework: 'react',
    }),
    (error) => {
      assert.equal(error.name, 'ProviderOutputError');
      assert.equal(error.message, 'AI provider returned an invalid forecast.');
      return true;
    },
  );
});
