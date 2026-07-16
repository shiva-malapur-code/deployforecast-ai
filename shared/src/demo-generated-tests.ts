import type { GeneratedTests, GeneratedTestsRequest, GeneratedTestStrategy } from './schemas.js';

const reviewWarning =
  'Review, adapt, and run these tests before merging. Confirm component imports, required props, mocks, and expected UI copy in your application.';

export function createDemoGeneratedTests(
  input: GeneratedTestsRequest,
  provider = 'mock',
): GeneratedTests {
  const strategies = input.forecast.risks.slice(0, 8).flatMap((risk): GeneratedTestStrategy[] => {
    const evidence = input.forecast.signals.filter((signal) => risk.signalIds.includes(signal.id));
    if (!evidence.length) return [];
    return [
      {
        riskId: risk.id,
        signalIds: evidence.map((signal) => signal.id),
        title: strategyTitle(risk.category),
        cases: strategyCases(
          risk.category,
          evidence.map((signal) => signal.id),
        ),
      },
    ];
  });

  return {
    id: `tests-${Date.now()}`,
    generatedAt: new Date().toISOString(),
    provider,
    testFramework: 'vitest',
    testingLibrary: '@testing-library/react',
    testCode: strategies.length ? buildTestCode(strategies) : '',
    summary: strategies.length
      ? `${strategies.length} behavior-oriented test strategies were generated from forecast risks.`
      : 'No forecast-linked test strategy was available for this component.',
    assumptions: [
      'Vitest and React Testing Library are installed and configured by the consuming project.',
      'Update the ComponentUnderTest import path and provide any required props or application providers.',
      'Todo cases intentionally avoid inventing product-specific labels, response fixtures, or unavailable dependencies.',
    ],
    strategies,
    reviewWarning,
  };
}

function strategyTitle(category: GeneratedTestStrategyCategory): string {
  const titles: Record<GeneratedTestStrategyCategory, string> = {
    accessibility: 'Verify accessible interaction behavior',
    reliability: 'Verify resilient request and state behavior',
    performance: 'Verify stable user-visible rendering behavior',
    security: 'Verify untrusted content remains inert',
    maintainability: 'Verify the component contract through public behavior',
  };
  return titles[category];
}

type GeneratedTestStrategyCategory = GeneratedTestsRequest['forecast']['risks'][number]['category'];

function strategyCases(category: GeneratedTestStrategyCategory, signalIds: string[]): string[] {
  if (category === 'accessibility') {
    return [
      'Queries controls by accessible role and name.',
      'Verifies relevant actions remain keyboard operable.',
    ];
  }
  if (category === 'reliability' && signalIds.some((id) => id.includes('fetch'))) {
    return [
      'Shows a loading state while the request is pending.',
      'Shows a recoverable error state when the request rejects.',
      'Shows an intentional empty state when the request returns no items.',
    ];
  }
  if (category === 'security') {
    return ['Renders untrusted content as text rather than executable markup.'];
  }
  if (category === 'performance') {
    return ['Preserves visible row identity and focus across rerenders.'];
  }
  return ['Renders the component and verifies behavior through its public UI contract.'];
}

function buildTestCode(strategies: GeneratedTestStrategy[]): string {
  const todos = strategies
    .flatMap((strategy) => strategy.cases)
    .map((testCase) => `  it.todo(${JSON.stringify(testCase)});`)
    .join('\n');

  return `import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import ComponentUnderTest from './ComponentUnderTest';

describe('ComponentUnderTest behavior', () => {
  it('renders without crashing', () => {
    const { container } = render(<ComponentUnderTest />);
    expect(container.firstChild).toBeTruthy();
  });

${todos}
});`;
}
