import React from 'react';
import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createDemoForecast,
  createDemoGeneratedTests,
  type ForecastRequest,
} from '@deploy-forecast/shared';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  GeneratedTestsContent,
  GeneratedTestsPanel,
} from '../src/components/generated-tests-panel.tsx';
import { getGeneratedTestsFilename } from '../src/utils/generated-tests-download.ts';

const request: ForecastRequest = {
  code: 'export function Clear() { return <div onClick={() => clear()}>Clear</div>; }',
  language: 'typescript',
  framework: 'react',
};

test('renders generated tests, linked strategies, assumptions, and merge warning', () => {
  const forecast = createDemoForecast(request, 'test');
  const generated = createDemoGeneratedTests({ ...request, forecast }, 'test');
  const markup = renderToStaticMarkup(
    <GeneratedTestsContent
      tests={generated}
      language="typescript"
      onRegenerate={() => undefined}
    />,
  );

  assert.match(markup, /Generated Vitest and React Testing Library tests/);
  assert.match(markup, /Linked test strategies/);
  assert.match(markup, /Assumptions/);
  assert.match(markup, /Review, adapt, and run these tests before merging/);
  assert.match(markup, /Loading code editor/);
});

test('renders a purpose-built empty state when no test code is returned', () => {
  const safeRequest: ForecastRequest = {
    code: 'export function Button() { return <button>Save</button>; }',
    language: 'typescript',
    framework: 'react',
  };
  const forecast = createDemoForecast(safeRequest, 'test');
  const generated = createDemoGeneratedTests({ ...safeRequest, forecast }, 'test');
  const markup = renderToStaticMarkup(
    <GeneratedTestsContent
      tests={generated}
      language="typescript"
      onRegenerate={() => undefined}
    />,
  );

  assert.equal(generated.testCode, '');
  assert.match(markup, /No tests generated/);
  assert.doesNotMatch(markup, /Generated Vitest and React Testing Library tests/);
});

test('uses the correct generated-test extension for each language', () => {
  assert.equal(getGeneratedTestsFilename('typescript'), 'deployforecast-generated.test.tsx');
  assert.equal(getGeneratedTestsFilename('javascript'), 'deployforecast-generated.test.jsx');
});

test('renders the generated-tests action without generating automatically', () => {
  const forecast = createDemoForecast(request, 'test');
  const markup = renderToStaticMarkup(
    <GeneratedTestsPanel submission={{ request: Object.freeze({ ...request }), forecast }} />,
  );

  assert.match(markup, /Generate forecast-linked tests/);
  assert.match(markup, /Generate Tests/);
  assert.doesNotMatch(markup, /Generated test suite/);
});
