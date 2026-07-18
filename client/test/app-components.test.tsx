import React from 'react';
import assert from 'node:assert/strict';
import test from 'node:test';
import { renderToStaticMarkup } from 'react-dom/server';
import App from '../src/App.tsx';
import { AppErrorBoundary } from '../src/components/app-error-boundary.tsx';
import { ImprovedCodePanel } from '../src/components/forecast-results.tsx';

test('renders the landing page, forecast workspace, scenario control, and primary action', () => {
  const markup = renderToStaticMarkup(<App />);

  assert.match(markup, /Can your app survive production/);
  assert.match(markup, /Run the engineering forecast/);
  assert.match(markup, /Judge mode/);
  assert.match(markup, /Search under traffic growth/);
  assert.match(markup, /Product list at 100k items/);
  assert.match(markup, /Checkout with a slow dependency/);
  assert.match(markup, /Deployment scenario/);
  assert.match(markup, /Traffic grows 10×/);
  assert.match(markup, /Forecast deployment/);
  assert.match(markup, /aria-labelledby="source-code-editor-label"/);
  assert.match(markup, /UserSearch\.tsx/);
});

test('renders the application error boundary fallback without exposing source code', () => {
  const boundary = new AppErrorBoundary({ children: <p>private source</p> });
  boundary.state = { failed: true };
  const markup = renderToStaticMarkup(boundary.render());

  assert.match(markup, /DeployForecast needs to restart/);
  assert.match(markup, /Your source code has not been stored/);
  assert.match(markup, /Reload application/);
  assert.doesNotMatch(markup, /private source/);
});

test('renders preventive-fix loading and recoverable error states', () => {
  const loading = renderToStaticMarkup(
    <ImprovedCodePanel
      fix={null}
      language="typescript"
      loading
      error={null}
      onGenerate={() => undefined}
    />,
  );
  const failed = renderToStaticMarkup(
    <ImprovedCodePanel
      fix={null}
      language="typescript"
      loading={false}
      error="Temporary provider failure."
      onGenerate={() => undefined}
    />,
  );

  assert.match(loading, /Generating an evidence-backed fix/);
  assert.match(loading, /aria-live="polite"/);
  assert.match(failed, /role="alert"/);
  assert.match(failed, /Temporary provider failure/);
  assert.match(failed, /Generate Preventive Fix/);
});
