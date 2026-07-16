import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Props {
  children: ReactNode;
}

interface State {
  failed: boolean;
}

export class AppErrorBoundary extends Component<Props, State> {
  state: State = { failed: false };

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Application render failed', error.name, info.componentStack);
  }

  render() {
    if (!this.state.failed) return this.props.children;

    return (
      <main className="grid min-h-screen place-items-center bg-background px-5 text-foreground">
        <section className="max-w-md rounded-xl border border-red-400/30 bg-card p-8 text-center">
          <AlertTriangle className="mx-auto size-8 text-red-300" aria-hidden="true" />
          <h1 className="mt-4 text-xl font-semibold text-white">DeployForecast needs to restart</h1>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            An unexpected interface error occurred. Your source code has not been stored.
          </p>
          <Button className="mt-6" onClick={() => window.location.reload()}>
            <RotateCcw className="size-4" /> Reload application
          </Button>
        </section>
      </main>
    );
  }
}
