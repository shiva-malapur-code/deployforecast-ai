import assert from 'node:assert/strict';
import test from 'node:test';
import { createDemoForecast } from '@deploy-forecast/shared';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { ForecastDashboard } from '../src/components/forecast-dashboard.tsx';

test('renders the security score and purpose-built empty forecast states', () => {
  const forecast = createDemoForecast(
    {
      code: 'export function Button() { return <button>Save</button>; }',
      language: 'typescript',
      framework: 'react',
    },
    'test',
  );
  const markup = renderToStaticMarkup(
    <ForecastDashboard forecast={forecast} onDownload={() => undefined} />,
  );

  assert.match(markup, />Security</);
  assert.match(markup, /No priority risks were detected/);
  assert.match(markup, /No inspector findings matched/);
  assert.match(markup, /No preventive actions are required/);
  assert.match(markup, /No risks are forecast for this horizon/);
});
