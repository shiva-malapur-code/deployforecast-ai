import assert from 'node:assert/strict';
import test from 'node:test';
import { createDemoForecast } from '../dist/index.js';

test('derives risks from observable code signals', () => {
  const forecast = createDemoForecast(
    {
      code: `function Search() {
        useEffect(() => { fetch('/api/search').then(setData) });
        return <div onClick={() => {}}><img src="avatar.png" /></div>;
      }`,
      language: 'typescript',
      framework: 'react',
    },
    'test',
  );

  assert.equal(forecast.provider, 'test');
  assert.ok(forecast.risks.some((risk) => risk.id === 'risk-effect-loop'));
  assert.ok(forecast.risks.some((risk) => risk.category === 'accessibility'));
  assert.equal(forecast.deploymentRisk, 'critical');
  assert.ok(forecast.scores.health <= 59);
});

test('recognizes a large catalog scenario as a performance forecast', () => {
  const forecast = createDemoForecast(
    {
      code: `export function List({ items }) { return items.map((item) => <div key={item.id}>{item.name}</div>); }`,
      language: 'typescript',
      framework: 'react',
      scenario: 'The catalog reaches 100k items',
    },
    'test',
  );

  assert.ok(forecast.risks.some((risk) => risk.id === 'risk-scenario-volume'));
});

test('adds a calibrated what-if scenario without inventing probabilities', () => {
  const forecast = createDemoForecast(
    {
      code: `export function Button() { return <button>Save</button>; }`,
      language: 'typescript',
      framework: 'react',
      scenario: 'Traffic grows 10×',
    },
    'test',
  );

  assert.ok(forecast.risks.some((risk) => risk.id === 'risk-scenario-scale'));
  assert.doesNotMatch(forecast.summary, /\d+% chance/i);
});
