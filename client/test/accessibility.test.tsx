import React from 'react';
import assert from 'node:assert/strict';
import test from 'node:test';
import axe from 'axe-core';
import { JSDOM } from 'jsdom';
import { createDemoForecast } from '@deploy-forecast/shared';
import { renderToStaticMarkup } from 'react-dom/server';
import App from '../src/App.tsx';
import { ForecastDashboard } from '../src/components/forecast-dashboard.tsx';

async function seriousAxeViolations(markup: string) {
  const dom = new JSDOM(
    `<!doctype html><html lang="en"><head><title>DeployForecast test</title></head><body>${markup}</body></html>`,
    { pretendToBeVisual: true, runScripts: 'outside-only' },
  );
  dom.window.eval(axe.source);
  const axeRuntime = dom.window.axe;
  const results = await axeRuntime.run(dom.window.document, {
    rules: {
      'color-contrast': { enabled: false },
    },
  });
  dom.window.close();
  return results.violations.filter(
    (violation) => violation.impact === 'critical' || violation.impact === 'serious',
  );
}

test('landing page and forecast workspace have no serious axe violations', async () => {
  const violations = await seriousAxeViolations(renderToStaticMarkup(<App />));

  assert.equal(
    violations.length,
    0,
    JSON.stringify(
      violations.map(({ id, impact, nodes }) => ({ id, impact, nodes: nodes.length })),
    ),
  );
});

test('scenario comparison dashboard has no serious axe violations', async () => {
  const request = {
    code: `function Search() { fetch('/api/search'); return <button>Search</button>; }`,
    language: 'typescript' as const,
    framework: 'react' as const,
    scenario: 'The API becomes slow',
  };
  const forecast = createDemoForecast(request, 'test');
  const markup = renderToStaticMarkup(
    <main>
      <ForecastDashboard forecast={forecast} onDownload={() => undefined} />
    </main>,
  );
  const violations = await seriousAxeViolations(markup);

  assert.equal(
    violations.length,
    0,
    JSON.stringify(
      violations.map(({ id, impact, nodes }) => ({ id, impact, nodes: nodes.length })),
    ),
  );
});
