import type { EngineeringForecast, ForecastRequest } from '@deploy-forecast/shared';
import type { AIProvider } from './ai-provider.js';

export class MockProvider implements AIProvider {
  readonly name = 'mock';

  async forecast(_input: ForecastRequest): Promise<EngineeringForecast> {
    await new Promise((resolve) => setTimeout(resolve, 700));

    return {
      id: crypto.randomUUID(),
      generatedAt: new Date().toISOString(),
      provider: this.name,
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
}
