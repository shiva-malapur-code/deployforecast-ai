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
  Clock3,
  Download,
  Eye,
  Gauge,
  ShieldAlert,
  Sparkles,
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
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <Metric icon={Gauge} label="Application health" value={`${forecast.scores.health}%`} />
        <Metric icon={ShieldAlert} label="Deployment risk" value={forecast.deploymentRisk} alert />
        <Metric icon={Sparkles} label="Forecast engine" value={forecast.provider} />
      </div>

      <Card className="p-5">
        <div className="flex items-start justify-between gap-4">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">
            Forecast summary
          </p>
          <Button
            variant="ghost"
            size="default"
            onClick={onDownload}
            className="-mr-2 -mt-2 h-8 px-2 text-xs"
          >
            <Download className="size-3.5" /> Report
          </Button>
        </div>
        <p className="mt-3 text-sm leading-6 text-[#c6d3cf]">{forecast.summary}</p>
        <div className="mt-4 grid grid-cols-2 gap-2 border-t border-border pt-4 text-xs sm:grid-cols-4">
          <Score label="Reliability" value={forecast.scores.reliability} />
          <Score label="Performance" value={forecast.scores.performance} />
          <Score label="Accessibility" value={forecast.scores.accessibility} />
          <Score label="Maintainability" value={forecast.scores.maintainability} />
        </div>
      </Card>

      <Card className="p-4">
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

function Metric({
  icon: Icon,
  label,
  value,
  alert = false,
}: {
  icon: typeof Gauge;
  label: string;
  value: string;
  alert?: boolean;
}) {
  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Icon className="size-4" />
        <span className="text-xs font-medium">{label}</span>
      </div>
      <p
        className={cn(
          'mt-3 truncate text-xl font-bold capitalize text-white',
          alert && 'text-orange-300',
        )}
      >
        {value}
      </p>
    </Card>
  );
}
