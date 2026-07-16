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

test('evaluates every useEffect dependency boundary independently', () => {
  const forecast = createDemoForecast(
    {
      code: `function Example() {
  useEffect(() => setReady(true), []);
  useEffect(() => setCount((count) => count + 1));
  return null;
}`,
      language: 'typescript',
      framework: 'react',
    },
    'test',
  );

  const signals = forecast.signals.filter((signal) => signal.id.startsWith('signal-effect-loop'));
  assert.equal(signals.length, 1);
  assert.equal(signals[0]?.line, 3);
});

test('evaluates an accessible name for every input independently', () => {
  const forecast = createDemoForecast(
    {
      code: `function Form() {
  return <><label htmlFor="name">Name</label>
    <input id="name" />
    <input id="email" /></>;
}`,
      language: 'typescript',
      framework: 'react',
    },
    'test',
  );

  const signals = forecast.signals.filter((signal) => signal.id.startsWith('signal-input-label'));
  assert.equal(signals.length, 1);
  assert.equal(signals[0]?.line, 4);
});

test('evaluates rejection handling for every fetch call independently', () => {
  const forecast = createDemoForecast(
    {
      code: `function load() {
  fetch('/handled').catch(reportError);
  fetch('/unhandled');
}`,
      language: 'typescript',
      framework: 'react',
    },
    'test',
  );

  const signals = forecast.signals.filter((signal) => signal.id.startsWith('signal-fetch-errors'));
  assert.equal(signals.length, 1);
  assert.equal(signals[0]?.line, 3);
});

test('reports the line of the weak-typing pattern that triggered the finding', () => {
  const forecast = createDemoForecast(
    {
      code: `type Payload = any;
export function parse(value: Payload) {
  return value;
}`,
      language: 'typescript',
      framework: 'react',
    },
    'test',
  );

  const signal = forecast.signals.find((item) => item.id === 'signal-weak-types');
  assert.equal(signal?.line, 1);
  assert.match(signal?.evidence ?? '', /any type/);
});
