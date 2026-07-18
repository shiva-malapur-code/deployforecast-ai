import assert from 'node:assert/strict';
import test from 'node:test';
import { compareForecastVersions, createDemoForecast } from '../dist/index.js';

const request = {
  code: `export function Search() {
    fetch('/api/search');
    return <div onClick={() => clear()}><img src="avatar.png" /></div>;
  }`,
  language: 'typescript',
  framework: 'react',
};

test('compares a preventive re-forecast across resolved, unchanged, and new risks', () => {
  const before = createDemoForecast(request, 'test');
  const after = createDemoForecast(
    {
      ...request,
      code: `export function Search() {
        fetch('/api/search');
        return <button type="button"><img src="avatar.png" alt="Avatar" /></button>;
      }`,
    },
    'test',
  );
  after.risks.push({
    id: 'risk-new',
    title: 'A newly introduced test risk',
    summary: 'Added only to exercise the union comparison.',
    category: 'maintainability',
    level: 'low',
    horizon: '90-days',
    confidence: 'medium',
    impact: 'Review effort may increase.',
    recommendation: 'Remove the synthetic risk.',
    signalIds: [],
  });

  const verification = compareForecastVersions(before, after);

  assert.equal(verification.counts.resolved, 2);
  assert.equal(verification.counts.unchanged, 1);
  assert.equal(verification.counts.new, 1);
  assert.equal(verification.beforeRiskCount, 3);
  assert.equal(verification.afterRiskCount, 2);
});

test('classifies severity reductions and increases using normalized title and category', () => {
  const before = createDemoForecast(request, 'test');
  const after = {
    ...before,
    risks: before.risks.map((risk, index) => ({
      ...risk,
      title: `  ${risk.title.toUpperCase()}  `,
      level: index === 0 ? 'critical' : index === 1 ? 'low' : risk.level,
    })),
  };

  const verification = compareForecastVersions(before, after);

  assert.equal(verification.counts.increased, 1);
  assert.equal(verification.counts.reduced, 1);
  assert.equal(verification.counts.unchanged, 1);
});
