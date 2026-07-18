import React from 'react';
import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createDemoForecast,
  createDemoPreventiveFix,
  compareForecastVersions,
  type ForecastRequest,
} from '@deploy-forecast/shared';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  ForecastResults,
  ImprovedCodePanel,
  VerificationPanel,
} from '../src/components/forecast-results.tsx';
import { getPreventiveFixFilename } from '../src/utils/preventive-fix-download.ts';

const request: ForecastRequest = {
  code: 'export function Clear() { return <div onClick={() => clear()}>Clear</div>; }',
  language: 'typescript',
  framework: 'react',
};
const forecast = createDemoForecast(request, 'test');
const fix = createDemoPreventiveFix({ ...request, forecast }, 'test');

test('renders a separate Improved Code tab without generating a fix automatically', () => {
  const markup = renderToStaticMarkup(
    <ForecastResults
      submission={{ forecast, request: Object.freeze({ ...request }) }}
      onDownloadReport={() => undefined}
    />,
  );

  assert.match(markup, /Improved Code/);
  assert.match(markup, /Generated Tests/);
  assert.match(markup, /aria-selected="false"/);
  assert.doesNotMatch(markup, /Original and improved React code comparison/);
});

test('renders the preventive fix diff panel and review controls', () => {
  const markup = renderToStaticMarkup(
    <ImprovedCodePanel
      fix={fix}
      language="typescript"
      loading={false}
      error={null}
      onGenerate={() => undefined}
    />,
  );

  assert.match(markup, /Preventive fix code comparison/);
  assert.match(markup, /Loading code editor/);
  assert.match(markup, /Review and test this preventive fix before use/);
  assert.match(markup, />Copy</);
  assert.match(markup, /Download<\/button>/);
});

test('uses a predictable download filename for the selected language', () => {
  assert.equal(getPreventiveFixFilename('typescript'), 'deployforecast-preventive-fix.tsx');
  assert.equal(getPreventiveFixFilename('javascript'), 'deployforecast-preventive-fix.jsx');
});

test('renders the Prevent and Verify action after a preventive fix is generated', () => {
  const markup = renderToStaticMarkup(
    <ImprovedCodePanel
      fix={fix}
      language="typescript"
      loading={false}
      error={null}
      onGenerate={() => undefined}
      originalForecast={forecast}
      verification={null}
      verificationLoading={false}
      verificationError={null}
      onVerify={() => undefined}
    />,
  );

  assert.match(markup, /Re-forecast improved code/);
  assert.doesNotMatch(markup, /Improved code re-forecast complete/);
});

test('renders measured before-and-after forecast verification results', () => {
  const verifiedForecast = createDemoForecast({ ...request, code: fix.improvedCode }, 'test');
  const verification = compareForecastVersions(forecast, verifiedForecast);
  const markup = renderToStaticMarkup(<VerificationPanel verification={verification} />);

  assert.match(markup, /Prevent &amp; Verify/);
  assert.match(markup, /Improved code re-forecast complete/);
  assert.match(markup, /not estimated performance claims/);
  assert.match(markup, /resolved/);
  assert.match(markup, /removed/);
});
