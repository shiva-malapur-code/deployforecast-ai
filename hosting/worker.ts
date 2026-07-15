import type { EngineeringForecast, ForecastRequest } from '@deploy-forecast/shared';

interface Environment {
  ASSETS: { fetch(request: Request): Promise<Response> };
}

function createForecast(): EngineeringForecast {
  return {
    id: crypto.randomUUID(),
    generatedAt: new Date().toISOString(),
    provider: 'public-demo',
    summary:
      'The current component is functional, but request volume and unstable rendering patterns may create reliability and performance pressure as usage grows.',
    deploymentRisk: 'high',
    scores: {
      health: 68,
      reliability: 61,
      performance: 57,
      accessibility: 72,
      maintainability: 74,
    },
    signals: [
      {
        id: 'signal-effect',
        title: 'Effect executes after every render',
        evidence: 'The useEffect call has no dependency array.',
        line: 7,
      },
      {
        id: 'signal-key',
        title: 'List identity changes on every render',
        evidence: 'Math.random() is used as the mapped element key.',
        line: 23,
      },
      {
        id: 'signal-a11y',
        title: 'Interactive element has no keyboard semantics',
        evidence: 'A div handles click input without button semantics.',
        line: 15,
      },
    ],
    risks: [
      {
        id: 'risk-request-loop',
        title: 'Search traffic may multiply rapidly',
        summary: 'A render-triggered request can cause repeated fetches and state updates.',
        category: 'reliability',
        level: 'critical',
        horizon: 'now',
        confidence: 'high',
        impact: 'Users may see stale results while the API receives unnecessary traffic.',
        recommendation: 'Add effect dependencies, debounce the query, and cancel stale requests.',
        signalIds: ['signal-effect'],
      },
      {
        id: 'risk-rendering',
        title: 'Large result sets may feel unstable',
        summary: 'Random keys force React to remount every result whenever the list renders.',
        category: 'performance',
        level: 'high',
        horizon: '7-days',
        confidence: 'high',
        impact: 'Rendering cost rises and focus or local row state can be lost.',
        recommendation: 'Use a stable user identifier and virtualize genuinely large lists.',
        signalIds: ['signal-key'],
      },
      {
        id: 'risk-access',
        title: 'Keyboard users may be blocked',
        summary: 'The clear-search action cannot be reached or activated with a keyboard.',
        category: 'accessibility',
        level: 'medium',
        horizon: '30-days',
        confidence: 'high',
        impact: 'Some users cannot complete the workflow and support friction may increase.',
        recommendation: 'Use a semantic button and provide an accessible input label.',
        signalIds: ['signal-a11y'],
      },
      {
        id: 'risk-complexity',
        title: 'Regression risk may rise as features accumulate',
        summary: 'Networking, state, and presentation currently share one component boundary.',
        category: 'maintainability',
        level: 'medium',
        horizon: '90-days',
        confidence: 'medium',
        impact: 'Changes become harder to test and onboarding takes longer.',
        recommendation: 'Extract a typed data hook once the workflow gains another consumer.',
        signalIds: ['signal-effect', 'signal-key'],
      },
    ],
    preventionPlan: [
      'Stabilize request behavior and handle cancellation.',
      'Replace generated keys with persistent domain identifiers.',
      'Add keyboard semantics, labels, loading, empty, and error states.',
      'Cover search timing and stale-response behavior with tests.',
    ],
    disclaimer:
      'Forecasts are evidence-based risk assessments, not guarantees. Validate them with runtime telemetry and load testing.',
  };
}

export default {
  async fetch(request: Request, env: Environment): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === '/api/health') {
      return Response.json({ status: 'ok' });
    }

    if (url.pathname === '/api/forecast' && request.method === 'POST') {
      const input = (await request.json()) as Partial<ForecastRequest>;
      if (typeof input.code !== 'string' || input.code.length < 20) {
        return Response.json(
          { error: 'Provide at least 20 characters of source code.' },
          { status: 400 },
        );
      }
      return Response.json(createForecast());
    }

    const assetResponse = await env.ASSETS.fetch(request);
    if (assetResponse.status !== 404) return assetResponse;

    return env.ASSETS.fetch(new Request(new URL('/index.html', request.url), request));
  },
};
