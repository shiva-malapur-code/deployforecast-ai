import type { GeneratedTests, GeneratedTestsRequest } from '@deploy-forecast/shared';

export function getGeneratedTestsFilename(language: GeneratedTestsRequest['language']): string {
  return `deployforecast-generated.test.${language === 'typescript' ? 'tsx' : 'jsx'}`;
}

export function downloadGeneratedTests(
  tests: GeneratedTests,
  language: GeneratedTestsRequest['language'],
): string {
  const filename = getGeneratedTestsFilename(language);
  const url = URL.createObjectURL(new Blob([tests.testCode], { type: 'text/plain' }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
  return filename;
}
