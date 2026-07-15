import { useState } from 'react';
import type { EngineeringForecast } from '@deploy-forecast/shared';
import {
  ArrowDown,
  ArrowRight,
  CloudSun,
  FlaskConical,
  LoaderCircle,
  Radar,
  ShieldCheck,
  WandSparkles,
} from 'lucide-react';
import { Brand } from '@/components/brand';
import { CodeEditorPlaceholder } from '@/components/code-editor-placeholder';
import { ForecastDashboard } from '@/components/forecast-dashboard';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { sampleCode } from '@/data/sample-code';
import { createForecast } from '@/services/forecast-api';
import { downloadForecastReport } from '@/utils/report-generator';

const scenarioSuggestions = [
  'Traffic grows 10×',
  'The API becomes slow',
  'The catalog reaches 100k items',
];

export default function App() {
  const [code, setCode] = useState(sampleCode);
  const [forecast, setForecast] = useState<EngineeringForecast | null>(null);
  const [scenario, setScenario] = useState('Traffic grows 10×');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function runForecast() {
    setLoading(true);
    setError(null);
    document.querySelector('#workspace')?.scrollIntoView({ behavior: 'smooth' });

    try {
      setForecast(
        await createForecast({
          code,
          language: 'typescript',
          framework: 'react',
          scenario: scenario.trim() || undefined,
        }),
      );
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to generate the forecast.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div id="top" className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-30 border-b border-border/70 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 lg:px-8">
          <Brand />
          <nav
            className="hidden items-center gap-7 text-sm text-muted-foreground md:flex"
            aria-label="Primary navigation"
          >
            <a href="#how-it-works" className="hover:text-white">
              How it works
            </a>
            <a href="#workspace" className="hover:text-white">
              Forecast lab
            </a>
          </nav>
          <Button
            variant="outline"
            onClick={() =>
              document.querySelector('#workspace')?.scrollIntoView({ behavior: 'smooth' })
            }
          >
            Open workspace <ArrowRight className="size-4" />
          </Button>
        </div>
      </header>

      <main>
        <section className="relative overflow-hidden border-b border-border px-5 pb-24 pt-20 lg:px-8 lg:pb-32 lg:pt-28">
          <div className="hero-grid absolute inset-0 opacity-40" />
          <div className="absolute left-1/2 top-20 h-72 w-72 -translate-x-1/2 rounded-full bg-primary/10 blur-[100px]" />
          <div className="relative mx-auto max-w-5xl text-center">
            <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1.5 text-xs font-semibold text-primary">
              <CloudSun className="size-3.5" /> AI engineering forecast
            </div>
            <h1 className="mx-auto mt-7 max-w-4xl text-balance text-5xl font-semibold tracking-[-0.045em] text-white sm:text-6xl lg:text-7xl">
              Know what happens after you deploy.{' '}
              <span className="text-primary">Before you deploy.</span>
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-pretty text-base leading-7 text-muted-foreground sm:text-lg">
              DeployForecast turns code signals into a time-based view of likely production risks,
              their impact, and the actions that prevent them.
            </p>
            <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button
                size="lg"
                onClick={() =>
                  document.querySelector('#workspace')?.scrollIntoView({ behavior: 'smooth' })
                }
              >
                Forecast my deployment <Radar className="size-4" />
              </Button>
              <Button
                size="lg"
                variant="ghost"
                onClick={() =>
                  document.querySelector('#how-it-works')?.scrollIntoView({ behavior: 'smooth' })
                }
              >
                See how it works <ArrowDown className="size-4" />
              </Button>
            </div>
          </div>
        </section>

        <section id="how-it-works" className="border-b border-border px-5 py-16 lg:px-8">
          <div className="mx-auto grid max-w-7xl gap-4 md:grid-cols-3">
            <Feature
              icon={Radar}
              number="01"
              title="Inspect real signals"
              text="Trace concrete patterns in code instead of inventing precise metrics."
            />
            <Feature
              icon={CloudSun}
              number="02"
              title="Forecast likely impact"
              text="Map each signal to a calibrated now, 7-day, 30-day, or 90-day risk."
            />
            <Feature
              icon={ShieldCheck}
              number="03"
              title="Prevent the failure"
              text="Turn every forecast into an evidence-linked, actionable prevention plan."
            />
          </div>
        </section>

        <section id="workspace" className="px-5 py-20 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <div className="mb-8 flex flex-col justify-between gap-5 md:flex-row md:items-end">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">
                  Forecast lab
                </p>
                <h2 className="mt-3 text-3xl font-semibold tracking-tight text-white">
                  Can this code survive production?
                </h2>
                <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
                  Edit the sample, choose a production scenario, and trace each forecast back to
                  observable evidence in the code.
                </p>
              </div>
              <Button onClick={runForecast} disabled={loading || code.trim().length < 20} size="lg">
                {loading ? (
                  <LoaderCircle className="size-4 animate-spin" />
                ) : (
                  <WandSparkles className="size-4" />
                )}
                {loading ? 'Reading the signals…' : 'Forecast deployment'}
              </Button>
            </div>

            <Card className="mb-5 p-4">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
                <div className="flex shrink-0 items-center gap-2 text-sm font-semibold text-white">
                  <FlaskConical className="size-4 text-primary" /> What if…
                </div>
                <label className="sr-only" htmlFor="deployment-scenario">
                  Deployment scenario
                </label>
                <input
                  id="deployment-scenario"
                  value={scenario}
                  onChange={(event) => setScenario(event.target.value)}
                  placeholder="e.g. traffic triples or the API becomes slow"
                  className="h-10 min-w-0 flex-1 rounded-md border border-border bg-[#08100f] px-3 text-sm text-white outline-none placeholder:text-muted-foreground focus:border-primary/50 focus:ring-1 focus:ring-primary/40"
                />
                <div className="flex flex-wrap gap-2">
                  {scenarioSuggestions.map((suggestion) => (
                    <button
                      key={suggestion}
                      type="button"
                      onClick={() => setScenario(suggestion)}
                      className={`rounded-full border px-3 py-1.5 text-xs transition-colors ${
                        scenario === suggestion
                          ? 'border-primary/40 bg-primary/10 text-primary'
                          : 'border-border text-muted-foreground hover:border-white/20 hover:text-white'
                      }`}
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            </Card>

            {error && (
              <div
                role="alert"
                className="mb-4 rounded-lg border border-red-400/30 bg-red-400/10 p-4 text-sm text-red-200"
              >
                {error}
              </div>
            )}

            <div className="grid gap-5 xl:grid-cols-[minmax(0,1.05fr)_minmax(420px,.95fr)]">
              <CodeEditorPlaceholder code={code} onChange={setCode} />
              {forecast ? (
                <ForecastDashboard
                  forecast={forecast}
                  onDownload={() => downloadForecastReport(forecast, code, scenario)}
                />
              ) : (
                <Card className="grid min-h-[480px] place-items-center border-dashed p-8 text-center">
                  <div className="max-w-xs">
                    <span className="mx-auto grid size-14 place-items-center rounded-2xl border border-primary/20 bg-primary/5 text-primary">
                      <CloudSun className="size-6" />
                    </span>
                    <h3 className="mt-5 text-lg font-semibold text-white">
                      Your forecast will appear here
                    </h3>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">
                      Not another issue list—a timeline of likely engineering consequences grounded
                      in observable signals.
                    </p>
                  </div>
                </Card>
              )}
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border px-5 py-8 lg:px-8">
        <div className="mx-auto flex max-w-7xl flex-col justify-between gap-3 text-xs text-muted-foreground sm:flex-row">
          <Brand />
          <p>Risk assessment, not fortune-telling. Built for evidence-led engineering.</p>
        </div>
      </footer>
    </div>
  );
}

function Feature({
  icon: Icon,
  number,
  title,
  text,
}: {
  icon: typeof Radar;
  number: string;
  title: string;
  text: string;
}) {
  return (
    <Card className="group p-6 transition-colors hover:border-primary/20">
      <div className="flex items-center justify-between">
        <Icon className="size-5 text-primary" />
        <span className="font-mono text-xs text-muted-foreground">{number}</span>
      </div>
      <h3 className="mt-10 font-semibold text-white">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">{text}</p>
    </Card>
  );
}
