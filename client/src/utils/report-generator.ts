import type { EngineeringForecast } from '@deploy-forecast/shared';

export function downloadForecastReport(
  forecast: EngineeringForecast,
  sourceCode: string,
  scenario: string,
) {
  const scores = Object.entries(forecast.scores)
    .map(([name, score]) => `- ${name[0]?.toUpperCase()}${name.slice(1)}: ${score}/100`)
    .join('\n');
  const risks = forecast.risks
    .map((risk, index) => {
      const evidence = forecast.signals
        .filter((signal) => risk.signalIds.includes(signal.id))
        .map((signal) => `  - ${signal.evidence}${signal.line ? ` (line ${signal.line})` : ''}`)
        .join('\n');
      return `## ${index + 1}. ${risk.title}\n\n- Severity: ${risk.level}\n- Horizon: ${risk.horizon}\n- Category: ${risk.category}\n- Confidence: ${risk.confidence}\n\n${risk.summary}\n\n**Evidence**\n${evidence || '  - Scenario-based assumption'}\n\n**Potential impact:** ${risk.impact}\n\n**Preventive action:** ${risk.recommendation}`;
    })
    .join('\n\n');

  const report = `# DeployForecast AI Engineering Forecast

Generated: ${new Date(forecast.generatedAt).toLocaleString()}
Provider: ${forecast.provider}
Scenario: ${scenario || 'Standard production deployment'}
Deployment risk: ${forecast.deploymentRisk}

## Executive summary

${forecast.summary}

## Engineering scores

${scores}

${risks || '## Risks\n\nNo risks matched the current inspection rules.'}

## Prevention plan

${forecast.preventionPlan.map((step) => `- ${step}`).join('\n') || '- Continue with runtime validation.'}

## Source analyzed

\`\`\`tsx
${sourceCode}
\`\`\`

> ${forecast.disclaimer}
`;

  const blob = new Blob([report], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `deployforecast-${forecast.id.slice(0, 8)}.md`;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}
