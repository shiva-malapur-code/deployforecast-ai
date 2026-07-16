import type { PreventiveFix, PreventiveFixRequest } from '@deploy-forecast/shared';

export function getPreventiveFixFilename(language: PreventiveFixRequest['language']): string {
  return `deployforecast-preventive-fix.${language === 'typescript' ? 'tsx' : 'jsx'}`;
}

export function downloadPreventiveFix(
  fix: PreventiveFix,
  language: PreventiveFixRequest['language'],
): string {
  const filename = getPreventiveFixFilename(language);
  const url = URL.createObjectURL(new Blob([fix.improvedCode], { type: 'text/plain' }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
  return filename;
}
