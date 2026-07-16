import type { ForecastRequest } from '@deploy-forecast/shared';
import {
  submitForecast,
  type ForecastRequester,
  type ForecastSubmission,
} from '@/services/forecast-submission';

export type ForecastRunResult =
  | { status: 'success'; submission: ForecastSubmission }
  | { status: 'stale' }
  | { status: 'duplicate' };

interface ActiveRequest {
  id: number;
  fingerprint: string;
  controller: AbortController;
}

export class ForecastRequestManager {
  private active?: ActiveRequest;
  private sequence = 0;

  constructor(private readonly requester: ForecastRequester) {}

  get isRunning(): boolean {
    return this.active !== undefined;
  }

  isDuplicate(input: ForecastRequest): boolean {
    return this.active?.fingerprint === fingerprintRequest(input);
  }

  async start(input: ForecastRequest): Promise<ForecastRunResult> {
    const request = Object.freeze({ ...input });
    const fingerprint = fingerprintRequest(request);
    if (this.active?.fingerprint === fingerprint) return { status: 'duplicate' };

    this.active?.controller.abort();
    const active: ActiveRequest = {
      id: ++this.sequence,
      fingerprint,
      controller: new AbortController(),
    };
    this.active = active;

    try {
      const submission = await submitForecast(request, this.requester, {
        signal: active.controller.signal,
      });
      if (this.active?.id !== active.id) return { status: 'stale' };
      return { status: 'success', submission };
    } catch (error) {
      if (this.active?.id !== active.id || active.controller.signal.aborted) {
        return { status: 'stale' };
      }
      throw error;
    } finally {
      if (this.active?.id === active.id) this.active = undefined;
    }
  }

  abort(): void {
    this.active?.controller.abort();
    this.active = undefined;
  }
}

function fingerprintRequest(input: ForecastRequest): string {
  return JSON.stringify({
    code: input.code,
    language: input.language,
    framework: input.framework,
    scenario: input.scenario ?? '',
  });
}
