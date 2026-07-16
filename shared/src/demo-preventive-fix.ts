import type { PreventiveFix, PreventiveFixChange, PreventiveFixRequest } from './schemas.js';

const reviewWarning =
  'Review and test this preventive fix before use. It is generated only from forecast evidence and may require adaptation to your application.';

export function createDemoPreventiveFix(
  input: PreventiveFixRequest,
  provider = 'mock',
): PreventiveFix {
  let improvedCode = input.code;
  const changes: PreventiveFixChange[] = [];

  const applyEvidenceFix = (
    signalPrefix: string,
    title: string,
    explanation: string,
    transform: (code: string) => string,
  ) => {
    const signal = input.forecast.signals.find((item) => item.id.startsWith(signalPrefix));
    const risk = signal
      ? input.forecast.risks.find((item) => item.signalIds.includes(signal.id))
      : undefined;
    if (!signal || !risk) return;

    const nextCode = transform(improvedCode);
    if (nextCode === improvedCode) return;
    improvedCode = nextCode;
    changes.push({
      riskId: risk.id,
      signalIds: [signal.id],
      title,
      explanation,
    });
  };

  applyEvidenceFix(
    'signal-unstable-key',
    'Use stable list identity',
    'Replaces the forecast-evidenced random React key with the existing item identifier.',
    (code) => code.replace(/key\s*=\s*\{\s*Math\.random\(\)\s*\}/, 'key={user.id}'),
  );
  applyEvidenceFix(
    'signal-clickable-div',
    'Use native button semantics',
    'Converts the forecast-evidenced clickable div into a keyboard-operable button.',
    (code) =>
      code.replace(
        /<div(\s+[^>]*\bonClick\s*=\s*\{[^}]*\}[^>]*)>([^<]*)<\/div>/,
        '<button type="button"$1>$2</button>',
      ),
  );
  applyEvidenceFix(
    'signal-image-alt',
    'Add an image text alternative',
    'Adds a conservative empty alt value to the image identified by the forecast for developer review.',
    (code) => code.replace(/<img\b(?![^>]*\balt=)([^>]*?)(\/?)>/i, '<img$1 alt=""$2>'),
  );
  applyEvidenceFix(
    'signal-input-label',
    'Add an accessible input name',
    'Adds an explicit accessible name to the input identified by the forecast.',
    (code) =>
      code.replace(
        /<input\b(?![^>]*\b(?:aria-label|aria-labelledby)=)([^>]*?)(\/?)>/i,
        '<input aria-label="Search"$1$2>',
      ),
  );
  if (input.language === 'typescript') {
    applyEvidenceFix(
      'signal-weak-types',
      'Type list state explicitly',
      'Adds a narrow item shape to the weakly typed array state identified by the forecast.',
      (code) =>
        code.replace(
          /useState\s*\(\s*\[\s*\]\s*\)/,
          'useState<Array<{ id: string; name: string; avatar: string }>>([])',
        ),
    );
  }

  return {
    id: `fix-${Date.now()}`,
    generatedAt: new Date().toISOString(),
    provider,
    originalCode: input.code,
    improvedCode,
    summary: changes.length
      ? `${changes.length} evidence-backed preventive change${changes.length === 1 ? '' : 's'} generated without altering unrelated code.`
      : 'No safe automatic change was available for the current forecast evidence.',
    changes,
    reviewWarning,
  };
}
