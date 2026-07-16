import {
  createDemoForecast,
  createDemoGeneratedTests,
  createDemoPreventiveFix,
  type ForecastRequest,
  type GeneratedTestsRequest,
  type PreventiveFixRequest,
} from '@deploy-forecast/shared';
import type { AIProvider } from './ai-provider.js';
import {
  parseProviderForecast,
  parseProviderGeneratedTests,
  parseProviderPreventiveFix,
} from './provider-output.js';

export class MockProvider implements AIProvider {
  readonly name = 'mock';

  async forecast(input: ForecastRequest, signal?: AbortSignal) {
    await abortableDelay(700, signal);
    return parseProviderForecast(createDemoForecast(input, this.name), this.name);
  }

  async generatePreventiveFix(input: PreventiveFixRequest, signal?: AbortSignal) {
    await abortableDelay(500, signal);
    return parseProviderPreventiveFix(createDemoPreventiveFix(input, this.name), this.name, input);
  }

  async generateTests(input: GeneratedTestsRequest, signal?: AbortSignal) {
    await abortableDelay(500, signal);
    return parseProviderGeneratedTests(
      createDemoGeneratedTests(input, this.name),
      this.name,
      input,
    );
  }
}

function abortableDelay(duration: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(signal.reason);
      return;
    }

    const timeout = setTimeout(resolve, duration);
    signal?.addEventListener(
      'abort',
      () => {
        clearTimeout(timeout);
        reject(signal.reason);
      },
      { once: true },
    );
  });
}
