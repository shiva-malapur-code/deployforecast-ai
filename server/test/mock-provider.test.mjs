import assert from 'node:assert/strict';
import test from 'node:test';
import { createDemoForecast, PreventiveFixSchema } from '@deploy-forecast/shared';
import { MockProvider } from '../dist/providers/mock-provider.js';

test('mock provider returns validated preventive code and preserves the original', async () => {
  const request = {
    code: 'export function Clear() { return <div onClick={() => clear()}>Clear</div>; }',
    language: 'typescript',
    framework: 'react',
  };
  const provider = new MockProvider();
  const fix = await provider.generatePreventiveFix({
    ...request,
    forecast: createDemoForecast(request, 'test'),
  });

  assert.equal(PreventiveFixSchema.safeParse(fix).success, true);
  assert.equal(fix.originalCode, request.code);
  assert.match(fix.improvedCode, /<button type="button"/);
  assert.equal(fix.changes[0].riskId, 'risk-clickable-div');
});
