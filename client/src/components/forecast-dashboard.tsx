import { useMemo, useState } from 'react';
import type {
  EngineeringForecast,
  ForecastHorizon,
  RiskCategory,
  RiskLevel,
} from '@deploy-forecast/shared';
import {
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  Clock3,
  Download,
  Eye,
  Gauge,
  ShieldAlert,
  Sparkles,
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
  const confidence = useMemo(() => getOverallConfidence(forecast), [forecast]);
  const topRisks = useMemo(
    () =>
      [...forecast.risks]
        .sort((left, right) => riskWeight[right.level] - riskWeight[left.level])
        .slice(0, 4),
    [forecast.risks],
  );
  const filteredRisks = useMemo(
    () =>
      forecast.risks.filter(
        (risk) =>
          (category === 'all' || risk.category === category) &&
          (horizon === 'all' || risk.horizon === horizon),
      ),
    [category, forecast.risks, horizon],
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
              <h2 className="font-semibold text-white">Engineering Forecast</h2>
              <p className="text-[11px] text-muted-foreground">Evidence-based deployment outlook</p>
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
                {forecast.scores.health}
              </span>
              <span className="text-sm text-muted-foreground">/100</span>
            </div>
            <HealthMeter value={forecast.scores.health} />
          </div>

          <div className="p-5">
            <div className="flex items-center gap-2 text-muted-foreground">
              <ShieldAlert className="size-4" />
              <p className="text-xs font-medium">Deployment Risk</p>
            </div>
            <span
              className={cn(
                'mt-4 inline-flex rounded-full border px-3 py-1.5 text-sm font-bold uppercase tracking-[0.12em]',
                riskStyle[forecast.deploymentRisk],
              )}
            >
              {forecast.deploymentRisk}
            </span>
          </div>

          <div className="p-5">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Sparkles className="size-4" />
              <p className="text-xs font-medium">Confidence</p>
            </div>
            <p className="mt-4 text-2xl font-bold capitalize text-white">{confidence}</p>
            <p className="mt-1 text-[11px] text-muted-foreground">
              Based on {forecast.signals.length} observable signal
              {forecast.signals.length === 1 ? '' : 's'}
            </p>
          </div>
        </div>
      </Card>

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
          {topRisks.map((risk) => (
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
          ))}
        </div>
      </Card>

      <Card className="p-5">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">
          Forecast summary
        </p>
        <p className="mt-3 text-sm leading-6 text-[#c6d3cf]">{forecast.summary}</p>
        <div className="mt-4 grid grid-cols-2 gap-2 border-t border-border pt-4 text-xs sm:grid-cols-4">
          <Score label="Reliability" value={forecast.scores.reliability} />
          <Score label="Performance" value={forecast.scores.performance} />
          <Score label="Accessibility" value={forecast.scores.accessibility} />
          <Score label="Maintainability" value={forecast.scores.maintainability} />
        </div>
      </Card>

      <ForecastTimeline forecast={forecast} />

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
          const evidence = forecast.signals.filter((signal) => risk.signalIds.includes(signal.id));
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
          {forecast.preventionPlan.map((step) => (
            <div key={step} className="flex gap-2.5 text-sm leading-5 text-muted-foreground">
              <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" />
              {step}
            </div>
          ))}
        </div>
      </Card>
      <p className="px-2 text-xs leading-5 text-muted-foreground">{forecast.disclaimer}</p>
    </div>
  );
}

const timelineHorizons: ForecastHorizon[] = ['7-days', '30-days', '90-days'];

function ForecastTimeline({ forecast }: { forecast: EngineeringForecast }) {
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
            {forecast.signals.map((signal) => (
              <span
                key={signal.id}
                className="rounded-full border border-border bg-white/[0.025] px-3 py-1.5 text-xs text-[#c6d3cf]"
                title={signal.evidence}
              >
                {signal.title}
              </span>
            ))}
          </div>
        </div>

        {timelineHorizons.map((horizon, index) => {
          const risks = forecast.risks.filter((risk) => risk.horizon === horizon);
          if (!risks.length) return null;

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
                  {risks.map((risk) => (
                    <div key={risk.id} className="rounded-lg border border-border bg-black/10 p-4">
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
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
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

function getOverallConfidence(forecast: EngineeringForecast): 'low' | 'medium' | 'high' {
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
