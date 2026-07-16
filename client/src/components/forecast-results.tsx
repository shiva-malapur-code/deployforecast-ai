import { useEffect, useRef, useState } from 'react';
import type { PreventiveFix } from '@deploy-forecast/shared';
import {
  Check,
  Clipboard,
  CodeXml,
  Download,
  LoaderCircle,
  ShieldCheck,
  TriangleAlert,
  WandSparkles,
} from 'lucide-react';
import { ForecastDashboard } from '@/components/forecast-dashboard';
import { MonacoDiffEditor } from '@/components/monaco-diff-editor';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ForecastApiError } from '@/services/forecast-api';
import { createPreventiveFix } from '@/services/preventive-fix-api';
import type { ForecastSubmission } from '@/services/forecast-submission';
import { downloadPreventiveFix } from '@/utils/preventive-fix-download';

export function ForecastResults({
  submission,
  onDownloadReport,
}: {
  submission: ForecastSubmission;
  onDownloadReport: () => void;
}) {
  const [tab, setTab] = useState<'forecast' | 'improved'>('forecast');
  const [fix, setFix] = useState<PreventiveFix | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const controllerRef = useRef<AbortController | null>(null);

  useEffect(() => () => controllerRef.current?.abort(), []);

  async function generateFix() {
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    setLoading(true);
    setError(null);

    try {
      const result = await createPreventiveFix(
        {
          code: submission.request.code,
          language: submission.request.language,
          framework: submission.request.framework,
          forecast: submission.forecast,
        },
        { signal: controller.signal },
      );
      if (!controller.signal.aborted) setFix(result);
    } catch (caught) {
      if (controller.signal.aborted) return;
      setError(
        caught instanceof ForecastApiError
          ? caught.message
          : 'The preventive fix could not be generated. Please try again.',
      );
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }

  return (
    <div className="min-w-0 space-y-4">
      <div
        className="flex rounded-lg border border-border bg-card p-1"
        role="tablist"
        aria-label="Forecast results"
      >
        <ResultTab active={tab === 'forecast'} onClick={() => setTab('forecast')}>
          <ShieldCheck className="size-4" /> Forecast
        </ResultTab>
        <ResultTab active={tab === 'improved'} onClick={() => setTab('improved')}>
          <CodeXml className="size-4" /> Improved Code
        </ResultTab>
      </div>

      {tab === 'forecast' ? (
        <ForecastDashboard forecast={submission.forecast} onDownload={onDownloadReport} />
      ) : (
        <ImprovedCodePanel
          fix={fix}
          language={submission.request.language}
          loading={loading}
          error={error}
          onGenerate={() => void generateFix()}
        />
      )}
    </div>
  );
}

export function ImprovedCodePanel({
  fix,
  language,
  loading,
  error,
  onGenerate,
}: {
  fix: PreventiveFix | null;
  language: ForecastSubmission['request']['language'];
  loading: boolean;
  error: string | null;
  onGenerate: () => void;
}) {
  const [copied, setCopied] = useState(false);

  async function copyCode() {
    if (!fix) return;
    await navigator.clipboard.writeText(fix.improvedCode);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1_500);
  }

  if (loading) {
    return (
      <Card className="grid min-h-[480px] place-items-center p-8 text-center" aria-live="polite">
        <div>
          <LoaderCircle className="mx-auto size-7 animate-spin text-primary" />
          <h3 className="mt-4 font-semibold text-white">Generating an evidence-backed fix</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Only forecast-supported changes will be included.
          </p>
        </div>
      </Card>
    );
  }

  if (!fix) {
    return (
      <Card className="grid min-h-[480px] place-items-center border-dashed p-8 text-center">
        <div className="max-w-sm">
          <WandSparkles className="mx-auto size-8 text-primary" aria-hidden="true" />
          <h3 className="mt-4 text-lg font-semibold text-white">Generate a preventive fix</h3>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            This runs separately from forecasting and changes only issues linked to visible
            evidence.
          </p>
          {error && (
            <p
              className="mt-4 rounded-md border border-red-400/30 bg-red-400/10 p-3 text-sm text-red-200"
              role="alert"
            >
              {error}
            </p>
          )}
          <Button className="mt-5" onClick={onGenerate}>
            <WandSparkles className="size-4" /> Generate Preventive Fix
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
            <h3 className="font-semibold text-white">Preventive fix</h3>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">{fix.summary}</p>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            <Button variant="outline" onClick={() => void copyCode()}>
              {copied ? <Check className="size-4" /> : <Clipboard className="size-4" />}
              {copied ? 'Copied' : 'Copy'}
            </Button>
            <Button variant="outline" onClick={() => downloadPreventiveFix(fix, language)}>
              <Download className="size-4" /> Download
            </Button>
          </div>
        </div>
        <div className="mt-4 flex items-start gap-2 rounded-lg border border-amber-300/25 bg-amber-300/[0.07] p-3 text-xs leading-5 text-amber-100">
          <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <span>{fix.reviewWarning}</span>
        </div>
      </Card>

      <MonacoDiffEditor
        original={fix.originalCode}
        improved={fix.improvedCode}
        language={language}
      />

      <Card className="p-4">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">
          Evidence-linked changes
        </p>
        <div className="mt-3 space-y-2">
          {fix.changes.length ? (
            fix.changes.map((change) => (
              <div
                key={`${change.riskId}-${change.title}`}
                className="rounded-lg border border-border p-3"
              >
                <p className="text-sm font-semibold text-white">{change.title}</p>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">{change.explanation}</p>
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">
              No safe automatic code change matched the current evidence.
            </p>
          )}
        </div>
      </Card>
    </div>
  );
}

function ResultTab({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={`flex flex-1 items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-semibold transition-colors ${
        active ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-white'
      }`}
    >
      {children}
    </button>
  );
}
