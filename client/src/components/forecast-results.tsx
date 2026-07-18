import { useEffect, useRef, useState } from 'react';
import {
  compareForecastVersions,
  type EngineeringForecast,
  type ForecastVerification,
  type PreventiveFix,
  type VerificationStatus,
} from '@deploy-forecast/shared';
import {
  ArrowRight,
  Check,
  Clipboard,
  CodeXml,
  Download,
  FlaskConical,
  LoaderCircle,
  Radar,
  ShieldCheck,
  TriangleAlert,
  WandSparkles,
} from 'lucide-react';
import { ForecastDashboard } from '@/components/forecast-dashboard';
import { GeneratedTestsPanel } from '@/components/generated-tests-panel';
import { MonacoDiffEditor } from '@/components/monaco-diff-editor';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { createForecast, ForecastApiError } from '@/services/forecast-api';
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
  const [tab, setTab] = useState<'forecast' | 'improved' | 'tests'>('forecast');
  const [fix, setFix] = useState<PreventiveFix | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [verification, setVerification] = useState<EngineeringForecast | null>(null);
  const [verificationLoading, setVerificationLoading] = useState(false);
  const [verificationError, setVerificationError] = useState<string | null>(null);
  const controllerRef = useRef<AbortController | null>(null);
  const verificationControllerRef = useRef<AbortController | null>(null);

  useEffect(
    () => () => {
      controllerRef.current?.abort();
      verificationControllerRef.current?.abort();
    },
    [],
  );

  async function generateFix() {
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    setLoading(true);
    setError(null);
    setVerification(null);
    setVerificationError(null);

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

  async function verifyFix() {
    if (!fix || verificationLoading) return;
    verificationControllerRef.current?.abort();
    const controller = new AbortController();
    verificationControllerRef.current = controller;
    setVerificationLoading(true);
    setVerificationError(null);

    try {
      const result = await createForecast(
        {
          ...submission.request,
          code: fix.improvedCode,
        },
        { signal: controller.signal },
      );
      if (!controller.signal.aborted) setVerification(result);
    } catch (caught) {
      if (controller.signal.aborted) return;
      setVerificationError(
        caught instanceof ForecastApiError
          ? caught.message
          : 'The improved code could not be re-forecast. Please try again.',
      );
    } finally {
      if (!controller.signal.aborted) setVerificationLoading(false);
    }
  }

  return (
    <div className="min-w-0 space-y-4">
      <div
        className="flex flex-wrap rounded-lg border border-border bg-card p-1"
        role="tablist"
        aria-label="Forecast results"
      >
        <ResultTab active={tab === 'forecast'} onClick={() => setTab('forecast')}>
          <ShieldCheck className="size-4" /> Forecast
        </ResultTab>
        <ResultTab active={tab === 'improved'} onClick={() => setTab('improved')}>
          <CodeXml className="size-4" /> Improved Code
        </ResultTab>
        <ResultTab active={tab === 'tests'} onClick={() => setTab('tests')}>
          <FlaskConical className="size-4" /> Generated Tests
        </ResultTab>
      </div>

      {tab === 'forecast' ? (
        <ForecastDashboard forecast={submission.forecast} onDownload={onDownloadReport} />
      ) : tab === 'improved' ? (
        <ImprovedCodePanel
          fix={fix}
          language={submission.request.language}
          loading={loading}
          error={error}
          onGenerate={() => void generateFix()}
          originalForecast={submission.forecast}
          verification={verification}
          verificationLoading={verificationLoading}
          verificationError={verificationError}
          onVerify={() => void verifyFix()}
        />
      ) : (
        <GeneratedTestsPanel submission={submission} />
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
  originalForecast,
  verification,
  verificationLoading,
  verificationError,
  onVerify,
}: {
  fix: PreventiveFix | null;
  language: ForecastSubmission['request']['language'];
  loading: boolean;
  error: string | null;
  onGenerate: () => void;
  originalForecast?: EngineeringForecast;
  verification?: EngineeringForecast | null;
  verificationLoading?: boolean;
  verificationError?: string | null;
  onVerify?: () => void;
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
            {onVerify && (
              <Button onClick={onVerify} disabled={verificationLoading}>
                {verificationLoading ? (
                  <LoaderCircle className="size-4 animate-spin" />
                ) : (
                  <Radar className="size-4" />
                )}
                {verificationLoading ? 'Re-forecasting…' : 'Re-forecast improved code'}
              </Button>
            )}
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
        {verificationError && (
          <div
            className="mt-3 flex flex-col items-start justify-between gap-3 rounded-lg border border-red-400/30 bg-red-400/10 p-3 text-xs text-red-200 sm:flex-row sm:items-center"
            role="alert"
          >
            <span>{verificationError}</span>
            {onVerify && (
              <Button variant="outline" onClick={onVerify} disabled={verificationLoading}>
                Try verification again
              </Button>
            )}
          </div>
        )}
      </Card>

      {originalForecast && verification && (
        <VerificationPanel verification={compareForecastVersions(originalForecast, verification)} />
      )}

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

const verificationStyle: Record<VerificationStatus, string> = {
  resolved: 'border-primary/30 bg-primary/[0.07] text-primary',
  reduced: 'border-sky-300/30 bg-sky-300/[0.07] text-sky-200',
  unchanged: 'border-border bg-white/[0.02] text-muted-foreground',
  increased: 'border-orange-300/30 bg-orange-300/[0.07] text-orange-200',
  new: 'border-red-300/30 bg-red-300/[0.07] text-red-200',
};

export function VerificationPanel({ verification }: { verification: ForecastVerification }) {
  const healthDelta = verification.afterHealth - verification.beforeHealth;
  const orderedStatuses: VerificationStatus[] = [
    'resolved',
    'reduced',
    'unchanged',
    'increased',
    'new',
  ];

  return (
    <Card className="overflow-hidden border-primary/25" aria-live="polite">
      <div className="border-b border-border bg-primary/[0.035] px-5 py-4">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">
          Prevent &amp; Verify
        </p>
        <h3 className="mt-2 font-semibold text-white">Improved code re-forecast complete</h3>
        <p className="mt-1 text-xs leading-5 text-muted-foreground">
          The same forecast pipeline inspected the generated code. Changes below are measured from
          the two validated forecast responses, not estimated performance claims.
        </p>
      </div>

      <div className="grid divide-y divide-border sm:grid-cols-[1.1fr_1fr] sm:divide-x sm:divide-y-0">
        <div className="p-5">
          <p className="text-xs font-medium text-muted-foreground">Application health</p>
          <div className="mt-3 flex items-center gap-3">
            <span className="text-2xl font-bold text-muted-foreground">
              {verification.beforeHealth}
            </span>
            <ArrowRight className="size-4 text-primary" aria-hidden="true" />
            <span className="text-3xl font-bold text-white">{verification.afterHealth}</span>
            <span
              className={`rounded-full border px-2 py-1 text-[10px] font-bold ${
                healthDelta > 0
                  ? 'border-primary/30 bg-primary/10 text-primary'
                  : healthDelta < 0
                    ? 'border-red-300/30 bg-red-300/10 text-red-200'
                    : 'border-border text-muted-foreground'
              }`}
            >
              {healthDelta > 0 ? '+' : ''}
              {healthDelta}
            </span>
          </div>
        </div>
        <div className="p-5">
          <p className="text-xs font-medium text-muted-foreground">Forecast risks</p>
          <p className="mt-3 text-sm text-white">
            <strong className="text-2xl">{verification.beforeRiskCount}</strong>
            <span className="mx-2 text-primary">→</span>
            <strong className="text-2xl">{verification.afterRiskCount}</strong>
          </p>
          <p className="mt-1 text-[11px] text-muted-foreground">Before and after prevention</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 border-t border-border p-4 sm:grid-cols-5">
        {orderedStatuses.map((status) => (
          <div key={status} className={`rounded-lg border p-3 ${verificationStyle[status]}`}>
            <p className="text-[10px] font-bold uppercase tracking-wider">{status}</p>
            <p className="mt-2 text-xl font-bold">{verification.counts[status]}</p>
          </div>
        ))}
      </div>

      <div className="space-y-2 border-t border-border p-4">
        {verification.comparisons.map((comparison) => (
          <div
            key={comparison.key}
            className="flex flex-col justify-between gap-2 rounded-lg border border-border bg-black/10 p-3 sm:flex-row sm:items-center"
          >
            <div>
              <p className="text-sm font-semibold text-white">{comparison.title}</p>
              <p className="mt-1 text-[10px] uppercase tracking-wider text-muted-foreground">
                {comparison.category}
              </p>
            </div>
            <span
              className={`self-start rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider sm:self-auto ${verificationStyle[comparison.status]}`}
            >
              {comparison.beforeLevel ?? 'not present'} → {comparison.afterLevel ?? 'removed'} ·{' '}
              {comparison.status}
            </span>
          </div>
        ))}
      </div>
    </Card>
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
      className={`flex min-w-[8.5rem] flex-1 items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-semibold transition-colors ${
        active ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-white'
      }`}
    >
      {children}
    </button>
  );
}
