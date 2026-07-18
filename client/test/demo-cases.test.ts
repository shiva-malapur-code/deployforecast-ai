import assert from 'node:assert/strict';
import test from 'node:test';
import { ForecastRequestSchema } from '@deploy-forecast/shared';
import { demoCases } from '../src/data/demo-cases.ts';

test('provides three valid one-click judge demonstrations with distinct scenarios', () => {
  assert.equal(demoCases.length, 3);
  assert.equal(new Set(demoCases.map((demo) => demo.id)).size, demoCases.length);
  assert.equal(new Set(demoCases.map((demo) => demo.scenario)).size, demoCases.length);

  demoCases.forEach((demo) => {
    assert.equal(
      ForecastRequestSchema.safeParse({
        code: demo.code,
        language: demo.language,
        framework: 'react',
        scenario: demo.scenario,
      }).success,
      true,
    );
  });
});
