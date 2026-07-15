import { Activity } from 'lucide-react';

export function Brand() {
  return (
    <a href="#top" className="flex items-center gap-2.5" aria-label="DeployForecast AI home">
      <span className="grid size-9 place-items-center rounded-lg border border-primary/30 bg-primary/10 text-primary">
        <Activity className="size-5" />
      </span>
      <span className="text-sm font-bold tracking-tight sm:text-base">
        DeployForecast <span className="text-primary">AI</span>
      </span>
    </a>
  );
}
