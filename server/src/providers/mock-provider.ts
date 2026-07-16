import { createDemoForecast, type ForecastRequest } from '@deploy-forecast/shared';
import type { AIProvider } from './ai-provider.js';
import { parseProviderForecast } from './provider-output.js';

export class MockProvider implements AIProvider {
  readonly name = 'mock';

  async forecast(input: ForecastRequest, signal?: AbortSignal) {
    await abortableDelay(700, signal);
    return parseProviderForecast(createDemoForecast(input, this.name), this.name);
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
