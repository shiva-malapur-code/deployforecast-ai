import { useMemo, useState } from 'react';
import type {
  EngineeringForecast,
  ForecastHorizon,
  ForecastSnapshot,
  RiskCategory,
  RiskLevel,
  ScenarioComparisonStatus,
  ScenarioForecast,
} from '@deploy-forecast/shared';
import {
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  Clock3,
  Download,
  Eye,
  Gauge,
  Minus,
  Plus,
  ShieldAlert,
  Sparkles,
  TrendingDown,
  TrendingUp,
  TriangleAlert,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

const horizonLabel: Record<ForecastHorizon, string> = {
  now: 'On deploy',
  '7-days': 'Next 7 days',
  '30-days': 'Next 30 days',
  '90-days': 'Next 90 days',
};

const riskStyle: Record<RiskLevel, string> = {
  low: 'border-primary/30 bg-primary/10 text-primary',
  medium: 'border-amber-300/30 bg-amber-300/10 text-amber-200',
  high: 'border-orange-400/30 bg-orange-400/10 text-orange-300',
  critical: 'border-red-400/30 bg-red-400/10 text-red-300',
};

const categories: Array<'all' | RiskCategory> = [
  'all',
  'reliability',
  'performance',
  'accessibility',
  'security',
  'maintainability',
];

export function ForecastDashboard({
  forecast,
  onDownload,
}: {
  forecast: EngineeringForecast;
  onDownload: () => void;
}) {
  const [category, setCategory] = useState<(typeof categories)[number]>('all');
  const [horizon, setHorizon] = useState<'all' | ForecastHorizon>('all');
  const [view, setView] = useState<'scenario' | 'baseline'>(
    forecast.scenario ? 'scenario' : 'baseline',
  );
  const activeForecast: ForecastSnapshot =
    view === 'baseline' && forecast.scenario ? forecast.scenario.baseline : forecast;
  const confidence = useMemo(() => getOverallConfidence(activeForecast), [activeForecast]);
  const topRisks = useMemo(
    () =>
      [...activeForecast.risks]
        .sort((left, right) => riskWeight[right.level] - riskWeight[left.level])
        .slice(0, 4),
    [activeForecast.risks],
  );
  const filteredRisks = useMemo(
    () =>
      activeForecast.risks.filter(
        (risk) =>
          (category === 'all' || risk.category === category) &&
          (horizon === 'all' || risk.horizon === horizon),
      ),
    [activeForecast.risks, category, horizon],
  );

  return (
    <div className="space-y-4" aria-live="polite">
      <Card className="overflow-hidden shadow-glow">
        <div className="flex items-center justify-between gap-4 border-b border-border bg-primary/[0.03] px-5 py-4">
          <div className="flex items-center gap-2.5">
            <span className="grid size-8 place-items-center rounded-lg border border-primary/25 bg-primary/10 text-primary">
              <Gauge className="size-4" />
            </span>
            <div>
              <h2 className="font-semibold text-white">
                {forecast.scenario
                  ? view === 'scenario'
                    ? 'Scenario Forecast'
                    : 'Baseline Forecast'
                  : 'Engineering Forecast'}
              </h2>
              <p className="text-[11px] text-muted-foreground">
                {forecast.scenario && view === 'scenario'
                  ? forecast.scenario.input
                  : 'Evidence-based deployment outlook'}
              </p>
            </div>
          </div>
          <Button variant="ghost" size="default" onClick={onDownload} className="h-8 px-2 text-xs">
            <Download className="size-3.5" /> Report
          </Button>
        </div>

        <div className="grid divide-y divide-border sm:grid-cols-[1.35fr_1fr_1fr] sm:divide-x sm:divide-y-0">
          <div className="p-5">
            <p className="text-xs font-medium text-muted-foreground">Application Health</p>
            <div className="mt-2 flex items-baseline gap-1">
              <span className="text-4xl font-bold tracking-tight text-white">
                {activeForecast.scores.health}
              </span>
              <span className="text-sm text-muted-foreground">/100</span>
            </div>
            <HealthMeter value={activeForecast.scores.health} />
          </div>

          <div className="p-5">
            <div className="flex items-center gap-2 text-muted-foreground">
              <ShieldAlert className="size-4" />
              <p className="text-xs font-medium">Deployment Risk</p>
            </div>
            <span
              className={cn(
                'mt-4 inline-flex rounded-full border px-3 py-1.5 text-sm font-bold uppercase tracking-[0.12em]',
                riskStyle[activeForecast.deploymentRisk],
              )}
            >
              {activeForecast.deploymentRisk}
            </span>
          </div>

          <div className="p-5">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Sparkles className="size-4" />
              <p className="text-xs font-medium">Confidence</p>
            </div>
            <p className="mt-4 text-2xl font-bold capitalize text-white">{confidence}</p>
            <p className="mt-1 text-[11px] text-muted-foreground">
              Based on {activeForecast.signals.length} observable signal
              {activeForecast.signals.length === 1 ? '' : 's'}
            </p>
          </div>
        </div>
      </Card>

      {forecast.scenario && (
        <ScenarioComparisonPanel
          scenario={forecast.scenario}
          scenarioSignals={forecast.signals}
          view={view}
          onViewChange={setView}
        />
      )}

      <Card className="p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">
              Top future risks
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              The most important outcomes to prevent before release
            </p>
          </div>
          <TriangleAlert className="size-5 text-amber-300" />
        </div>
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          {topRisks.length ? (
            topRisks.map((risk) => (
              <div
                key={risk.id}
                className="flex items-start gap-2.5 rounded-lg border border-border bg-black/10 p-3"
              >
                <span
                  className={cn(
                    'mt-1 size-2 shrink-0 rounded-full',
                    risk.level === 'critical' || risk.level === 'high'
                      ? 'bg-orange-300'
                      : 'bg-amber-200',
                  )}
                />
                <div>
                  <p className="text-sm font-medium leading-5 text-white">{risk.title}</p>
                  <p className="mt-1 text-[11px] uppercase tracking-wider text-muted-foreground">
                    {horizonLabel[risk.horizon]} · {risk.category}
                  </p>
                </div>
              </div>
            ))
          ) : (
            <EmptyState className="sm:col-span-2">
              No priority risks were detected by the current inspection rules.
            </EmptyState>
          )}
        </div>
      </Card>

      <Card className="p-5">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">
          Forecast summary
        </p>
        <p className="mt-3 text-sm leading-6 text-[#c6d3cf]">{activeForecast.summary}</p>
        <div className="mt-4 grid grid-cols-2 gap-2 border-t border-border pt-4 text-xs sm:grid-cols-5">
          <Score label="Reliability" value={activeForecast.scores.reliability} />
          <Score label="Performance" value={activeForecast.scores.performance} />
          <Score label="Accessibility" value={activeForecast.scores.accessibility} />
          <Score label="Security" value={activeForecast.scores.security} />
          <Score label="Maintainability" value={activeForecast.scores.maintainability} />
        </div>
      </Card>

      <ForecastTimeline forecast={activeForecast} />

      <Card className="p-4">
        <div className="mb-4">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">
            Risk explorer
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Inspect the evidence and prevention action behind each forecast
          </p>
        </div>
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap gap-2" aria-label="Filter by category">
            {categories.map((item) => (
              <FilterButton key={item} active={category === item} onClick={() => setCategory(item)}>
                {item}
              </FilterButton>
            ))}
          </div>
          <div
            className="flex flex-wrap gap-2 border-t border-border pt-3"
            aria-label="Filter by timeline"
          >
            <FilterButton active={horizon === 'all'} onClick={() => setHorizon('all')}>
              All timelines
            </FilterButton>
            {(Object.keys(horizonLabel) as ForecastHorizon[]).map((item) => (
              <FilterButton key={item} active={horizon === item} onClick={() => setHorizon(item)}>
                {horizonLabel[item]}
              </FilterButton>
            ))}
          </div>
        </div>
      </Card>

      <div className="relative space-y-3 before:absolute before:bottom-8 before:left-[19px] before:top-8 before:w-px before:bg-border">
        {filteredRisks.map((risk) => {
          const evidence = activeForecast.signals.filter((signal) =>
            risk.signalIds.includes(signal.id),
          );
          return (
            <Card
              key={risk.id}
              className="relative ml-0 overflow-hidden p-5 pl-14 transition-colors hover:border-white/15"
            >
              <span className="absolute left-3 top-6 z-10 grid size-8 place-items-center rounded-full border border-border bg-[#0d1715] text-muted-foreground">
                <Clock3 className="size-4" />
              </span>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                    {horizonLabel[risk.horizon]}
                  </p>
                  <h3 className="mt-1 text-base font-semibold text-white">{risk.title}</h3>
                </div>
                <span
                  className={cn(
                    'rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest',
                    riskStyle[risk.level],
                  )}
                >
                  {risk.level}
                </span>
              </div>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">{risk.summary}</p>
              <div className="mt-4 grid gap-3 rounded-lg border border-border bg-black/10 p-3 text-xs sm:grid-cols-2">
                <div>
                  <p className="flex items-center gap-1.5 font-semibold text-white">
                    <Eye className="size-3.5 text-primary" /> Evidence
                  </p>
                  {evidence.length ? (
                    evidence.map((signal) => (
                      <p key={signal.id} className="mt-2 leading-5 text-muted-foreground">
                        {signal.evidence}
                        {signal.line ? ` · line ${signal.line}` : ''}
                      </p>
                    ))
                  ) : (
                    <p className="mt-2 text-muted-foreground">Scenario-based assumption</p>
                  )}
                </div>
                <div>
                  <p className="font-semibold text-white">Potential impact</p>
                  <p className="mt-2 leading-5 text-muted-foreground">{risk.impact}</p>
                </div>
              </div>
              <div className="mt-4 flex items-start gap-2 border-t border-border pt-4 text-sm text-[#c6d3cf]">
                <ArrowRight className="mt-0.5 size-4 shrink-0 text-primary" />
                <span>
                  <strong className="text-white">Prevent it:</strong> {risk.recommendation}
                </span>
              </div>
            </Card>
          );
        })}
        {!filteredRisks.length && (
          <Card className="ml-0 p-6 text-center text-sm text-muted-foreground">
            No risks match these filters. Try another category or timeline.
          </Card>
        )}
      </div>

      <Card className="p-5">
        <h3 className="font-semibold text-white">Prevention plan</h3>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {activeForecast.preventionPlan.length ? (
            activeForecast.preventionPlan.map((step) => (
              <div key={step} className="flex gap-2.5 text-sm leading-5 text-muted-foreground">
                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" />
                {step}
              </div>
            ))
          ) : (
            <EmptyState className="sm:col-span-2">
              No preventive actions are required from the current static findings.
            </EmptyState>
          )}
        </div>
      </Card>
      <p className="px-2 text-xs leading-5 text-muted-foreground">{activeForecast.disclaimer}</p>
    </div>
  );
}

const comparisonStyle: Record<ScenarioComparisonStatus, string> = {
  new: 'border-sky-300/30 bg-sky-300/10 text-sky-200',
  increased: 'border-orange-300/30 bg-orange-300/10 text-orange-200',
  decreased: 'border-primary/30 bg-primary/10 text-primary',
  unchanged: 'border-border bg-white/[0.025] text-muted-foreground',
};

function ScenarioComparisonPanel({
  scenario,
  scenarioSignals,
  view,
  onViewChange,
}: {
  scenario: ScenarioForecast;
  scenarioSignals: ForecastSnapshot['signals'];
  view: 'scenario' | 'baseline';
  onViewChange: (view: 'scenario' | 'baseline') => void;
}) {
  const counts = scenario.comparisons.reduce(
    (totals, comparison) => ({
      ...totals,
      [comparison.status]: totals[comparison.status] + 1,
    }),
    { new: 0, increased: 0, decreased: 0, unchanged: 0 },
  );

  return (
    <Card className="overflow-hidden border-primary/20">
      <div className="flex flex-col justify-between gap-4 border-b border-border bg-primary/[0.035] px-5 py-4 sm:flex-row sm:items-start">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">
            Scenario forecast comparison
          </p>
          <p className="mt-2 text-sm font-medium text-white">“{scenario.input}”</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Compared with the preserved baseline using normalized title and category matching.
          </p>
        </div>
        <div
          className="flex shrink-0 rounded-lg border border-border bg-black/10 p-1"
          role="group"
          aria-label="Forecast view"
        >
          <button
            type="button"
            aria-pressed={view === 'scenario'}
            onClick={() => onViewChange('scenario')}
            className={cn(
              'rounded-md px-3 py-1.5 text-xs font-semibold transition-colors',
              view === 'scenario' ? 'bg-primary/10 text-primary' : 'text-muted-foreground',
            )}
          >
            Scenario forecast
          </button>
          <button
            type="button"
            aria-pressed={view === 'baseline'}
            onClick={() => onViewChange('baseline')}
            className={cn(
              'rounded-md px-3 py-1.5 text-xs font-semibold transition-colors',
              view === 'baseline' ? 'bg-primary/10 text-primary' : 'text-muted-foreground',
            )}
          >
            Baseline forecast
          </button>
        </div>
      </div>

      <div className="p-5">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {(Object.keys(counts) as ScenarioComparisonStatus[]).map((status) => (
            <div key={status} className={cn('rounded-lg border p-3', comparisonStyle[status])}>
              <div className="flex items-center gap-2">
                <ComparisonIcon status={status} />
                <span className="text-[10px] font-bold uppercase tracking-wider">{status}</span>
              </div>
              <p className="mt-2 text-xl font-bold">{counts[status]}</p>
            </div>
          ))}
        </div>

        <div className="mt-4 space-y-2">
          {scenario.comparisons.map((comparison) => {
            const evidence = scenarioSignals.filter((signal) =>
              comparison.signalIds.includes(signal.id),
            );
            return (
              <div key={comparison.key} className="rounded-lg border border-border bg-black/10 p-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-white">{comparison.title}</p>
                    <p className="mt-1 text-[10px] uppercase tracking-wider text-muted-foreground">
                      {comparison.category} · {comparison.confidence} confidence
                    </p>
                  </div>
                  <span
                    className={cn(
                      'rounded-full border px-2 py-1 text-[10px] font-bold uppercase tracking-wider',
                      comparisonStyle[comparison.status],
                    )}
                  >
                    {comparison.baselineLevel ?? 'not present'} → {comparison.scenarioLevel} ·{' '}
                    {comparison.status}
                  </span>
                </div>
                {evidence.length > 0 && (
                  <p className="mt-2 text-xs leading-5 text-muted-foreground">
                    Evidence: {evidence.map((signal) => signal.evidence).join(' ')}
                  </p>
                )}
              </div>
            );
          })}
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <ScenarioNotes title="Assumptions" items={scenario.assumptions} />
          <ScenarioNotes title="Limitations" items={scenario.limitations} />
        </div>
      </div>
    </Card>
  );
}

function ComparisonIcon({ status }: { status: ScenarioComparisonStatus }) {
  if (status === 'new') return <Plus className="size-3.5" aria-hidden="true" />;
  if (status === 'increased') return <TrendingUp className="size-3.5" aria-hidden="true" />;
  if (status === 'decreased') return <TrendingDown className="size-3.5" aria-hidden="true" />;
  return <Minus className="size-3.5" aria-hidden="true" />;
}

function ScenarioNotes({ title, items }: { title: string; items: string[] }) {
  return (
    <details className="rounded-lg border border-border bg-white/[0.015] p-3">
      <summary className="cursor-pointer text-xs font-semibold text-white">{title}</summary>
      <ul className="mt-3 space-y-2 text-xs leading-5 text-muted-foreground">
        {items.map((item) => (
          <li key={item}>• {item}</li>
        ))}
      </ul>
    </details>
  );
}

const timelineHorizons: ForecastHorizon[] = ['7-days', '30-days', '90-days'];

function ForecastTimeline({ forecast }: { forecast: ForecastSnapshot }) {
  return (
    <Card className="overflow-hidden">
      <div className="border-b border-border px-5 py-4">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">
          Forecast timeline
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          A causal story from today&apos;s signals to tomorrow&apos;s production impact
        </p>
      </div>

      <div className="p-5">
        <TimelineMarker label="Today" />
        <div className="ml-3 border-l border-primary/25 pb-6 pl-6 pt-3">
          <p className="text-sm font-semibold text-white">Inspector found</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {forecast.signals.length ? (
              forecast.signals.map((signal) => (
                <span
                  key={signal.id}
                  className="rounded-full border border-border bg-white/[0.025] px-3 py-1.5 text-xs text-[#c6d3cf]"
                  title={signal.evidence}
                >
                  {signal.title}
                </span>
              ))
            ) : (
              <EmptyState>No inspector findings matched the current static rules.</EmptyState>
            )}
          </div>
        </div>

        {timelineHorizons.map((horizon, index) => {
          const risks = forecast.risks.filter((risk) => risk.horizon === horizon);

          return (
            <div key={horizon}>
              <TimelineMarker label={horizonLabel[horizon]} />
              <div
                className={cn(
                  'ml-3 pl-6 pt-3',
                  index < timelineHorizons.length - 1 && 'border-l border-primary/25 pb-7',
                )}
              >
                <div className="space-y-4">
                  {risks.length ? (
                    risks.map((risk) => (
                      <div
                        key={risk.id}
                        className="rounded-lg border border-border bg-black/10 p-4"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <h3 className="text-sm font-semibold text-white">{risk.title}</h3>
                          <span
                            className={cn(
                              'rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest',
                              riskStyle[risk.level],
                            )}
                          >
                            {risk.confidence} confidence
                          </span>
                        </div>
                        <CausalStep label="Why it may happen" text={risk.summary} />
                        <ChevronDown className="mx-auto my-1 size-4 text-primary/60" />
                        <CausalStep label="Future impact" text={risk.impact} />
                        <ChevronDown className="mx-auto my-1 size-4 text-primary/60" />
                        <CausalStep label="Prevent it" text={risk.recommendation} highlighted />
                      </div>
                    ))
                  ) : (
                    <EmptyState>No risks are forecast for this horizon.</EmptyState>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

function EmptyState({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <p
      className={cn(
        'w-full rounded-lg border border-dashed border-border bg-white/[0.015] p-3 text-xs leading-5 text-muted-foreground',
        className,
      )}
    >
      {children}
    </p>
  );
}

function TimelineMarker({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="size-6 rounded-full border-4 border-[#0d1715] bg-primary shadow-[0_0_0_1px_rgba(65,232,176,.3)]" />
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary">{label}</p>
    </div>
  );
}

function CausalStep({
  label,
  text,
  highlighted = false,
}: {
  label: string;
  text: string;
  highlighted?: boolean;
}) {
  return (
    <div
      className={cn(
        'rounded-md border border-border px-3 py-2.5',
        highlighted ? 'border-primary/25 bg-primary/[0.06]' : 'bg-white/[0.02]',
      )}
    >
      <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 text-xs leading-5 text-[#c6d3cf]">{text}</p>
    </div>
  );
}

function FilterButton({
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
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        'rounded-full border px-2.5 py-1 text-[11px] font-semibold capitalize transition-colors',
        active
          ? 'border-primary/40 bg-primary/10 text-primary'
          : 'border-border text-muted-foreground hover:border-white/20 hover:text-white',
      )}
    >
      {children}
    </button>
  );
}

function Score({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <p className="text-muted-foreground">{label}</p>
      <div className="mt-1 flex items-center gap-2">
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/5">
          <div className="h-full rounded-full bg-primary" style={{ width: `${value}%` }} />
        </div>
        <span className="font-mono text-white">{value}</span>
      </div>
    </div>
  );
}

function HealthMeter({ value }: { value: number }) {
  const filledSegments = Math.round(value / 10);
  return (
    <div
      className="mt-4 flex gap-1"
      role="meter"
      aria-label="Application health"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={value}
    >
      {Array.from({ length: 10 }, (_, index) => (
        <span
          key={index}
          className={cn(
            'h-2 flex-1 rounded-sm',
            index < filledSegments ? 'bg-primary' : 'bg-white/[0.06]',
          )}
        />
      ))}
    </div>
  );
}

function getOverallConfidence(forecast: ForecastSnapshot): 'low' | 'medium' | 'high' {
  if (!forecast.risks.length) return 'medium';

  const confidenceWeight = { low: 1, medium: 2, high: 3 } as const;
  const average =
    forecast.risks.reduce((total, risk) => total + confidenceWeight[risk.confidence], 0) /
    forecast.risks.length;

  if (average >= 2.4) return 'high';
  if (average >= 1.5) return 'medium';
  return 'low';
}

const riskWeight: Record<RiskLevel, number> = {
  low: 1,
  medium: 2,
  high: 3,
  critical: 4,
};
