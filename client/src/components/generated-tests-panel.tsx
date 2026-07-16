import { useEffect, useRef, useState } from 'react';
import type { GeneratedTests } from '@deploy-forecast/shared';
import {
  Check,
  Clipboard,
  Download,
  FileCheck2,
  LoaderCircle,
  TriangleAlert,
  WandSparkles,
} from 'lucide-react';
import { MonacoReadOnlyEditor } from '@/components/monaco-read-only-editor';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ForecastApiError } from '@/services/forecast-api';
import { createGeneratedTests } from '@/services/generated-tests-api';
import type { ForecastSubmission } from '@/services/forecast-submission';
import { downloadGeneratedTests } from '@/utils/generated-tests-download';

export function GeneratedTestsPanel({ submission }: { submission: ForecastSubmission }) {
  const [tests, setTests] = useState<GeneratedTests | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const controllerRef = useRef<AbortController | null>(null);

  useEffect(() => () => controllerRef.current?.abort(), []);

  async function generateTests() {
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    setLoading(true);
    setError(null);

    try {
      const result = await createGeneratedTests(
        {
          code: submission.request.code,
          language: submission.request.language,
          framework: submission.request.framework,
          forecast: submission.forecast,
        },
        { signal: controller.signal },
      );
      if (!controller.signal.aborted) setTests(result);
    } catch (caught) {
      if (controller.signal.aborted) return;
      setError(
        caught instanceof ForecastApiError
          ? caught.message
          : 'The test suite could not be generated. Please try again.',
      );
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }

  if (loading) {
    return (
      <Card className="grid min-h-[480px] place-items-center p-8 text-center" aria-live="polite">
        <div>
          <LoaderCircle className="mx-auto size-7 animate-spin text-primary" />
          <h3 className="mt-4 font-semibold text-white">Generating behavior-oriented tests</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Mapping forecast risks to Vitest and React Testing Library strategies.
          </p>
        </div>
      </Card>
    );
  }

  if (!tests) {
    return (
      <Card className="grid min-h-[480px] place-items-center border-dashed p-8 text-center">
        <div className="max-w-sm">
          <FileCheck2 className="mx-auto size-8 text-primary" aria-hidden="true" />
          <h3 className="mt-4 text-lg font-semibold text-white">Generate forecast-linked tests</h3>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Create a separate Vitest and React Testing Library suite grounded in the submitted
            component and visible forecast risks.
          </p>
          {error && (
            <p
              className="mt-4 rounded-md border border-red-400/30 bg-red-400/10 p-3 text-sm text-red-200"
              role="alert"
            >
              {error}
            </p>
          )}
          <Button className="mt-5" onClick={() => void generateTests()}>
            <WandSparkles className="size-4" /> Generate Tests
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <GeneratedTestsContent
      tests={tests}
      language={submission.request.language}
      onRegenerate={() => void generateTests()}
    />
  );
}

export function GeneratedTestsContent({
  tests,
  language,
  onRegenerate,
}: {
  tests: GeneratedTests;
  language: ForecastSubmission['request']['language'];
  onRegenerate: () => void;
}) {
  const [copied, setCopied] = useState(false);

  async function copyTests() {
    await navigator.clipboard.writeText(tests.testCode);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1_500);
  }

  if (!tests.testCode.trim()) {
    return (
      <Card className="grid min-h-[480px] place-items-center border-dashed p-8 text-center">
        <div className="max-w-sm">
          <FileCheck2 className="mx-auto size-8 text-muted-foreground" aria-hidden="true" />
          <h3 className="mt-4 text-lg font-semibold text-white">No tests generated</h3>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">{tests.summary}</p>
          <Button className="mt-5" variant="outline" onClick={onRegenerate}>
            Try again
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <div className="min-w-0 space-y-4">
      <Card className="p-4">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
          <div>
            <h3 className="font-semibold text-white">Generated test suite</h3>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">{tests.summary}</p>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            <Button variant="outline" onClick={() => void copyTests()}>
              {copied ? <Check className="size-4" /> : <Clipboard className="size-4" />}
              {copied ? 'Copied' : 'Copy'}
            </Button>
            <Button variant="outline" onClick={() => downloadGeneratedTests(tests, language)}>
              <Download className="size-4" /> Download
            </Button>
          </div>
        </div>
        <div className="mt-4 flex items-start gap-2 rounded-lg border border-amber-300/25 bg-amber-300/[0.07] p-3 text-xs leading-5 text-amber-100">
          <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <span>{tests.reviewWarning}</span>
        </div>
      </Card>

      <MonacoReadOnlyEditor
        code={tests.testCode}
        language={language}
        label="Generated Vitest and React Testing Library tests"
      />

      <Card className="p-4">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">
          Linked test strategies
        </p>
        <div className="mt-3 space-y-3">
          {tests.strategies.map((strategy) => (
            <div key={strategy.riskId} className="rounded-lg border border-border p-3">
              <p className="text-sm font-semibold text-white">{strategy.title}</p>
              <p className="mt-1 text-[11px] uppercase tracking-wider text-muted-foreground">
                Forecast risk: {strategy.riskId}
              </p>
              <ul className="mt-2 space-y-1 text-xs leading-5 text-muted-foreground">
                {strategy.cases.map((testCase) => (
                  <li key={testCase}>• {testCase}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </Card>

      <Card className="p-4">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">Assumptions</p>
        <ul className="mt-3 space-y-2 text-xs leading-5 text-muted-foreground">
          {tests.assumptions.map((assumption) => (
            <li key={assumption}>• {assumption}</li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
