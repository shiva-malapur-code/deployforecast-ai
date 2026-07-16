import type { EngineeringForecast, ForecastRequest } from '@deploy-forecast/shared';
import { ProviderTimeoutError, RequestTimeoutError } from './errors.js';
import type { AIProvider } from './providers/ai-provider.js';

interface ProviderExecutionOptions {
  requestTimeoutMs: number;
  providerTimeoutMs: number;
}

export async function executeProviderForecast(
  provider: AIProvider,
  input: ForecastRequest,
  options: ProviderExecutionOptions,
): Promise<EngineeringForecast> {
  const controller = new AbortController();
  let requestTimer: ReturnType<typeof setTimeout> | undefined;
  let providerTimer: ReturnType<typeof setTimeout> | undefined;

  const requestTimeout = new Promise<never>((_, reject) => {
    requestTimer = setTimeout(() => {
      controller.abort(new RequestTimeoutError());
      reject(new RequestTimeoutError());
    }, options.requestTimeoutMs);
  });
  const providerTimeout = new Promise<never>((_, reject) => {
    providerTimer = setTimeout(() => {
      controller.abort(new ProviderTimeoutError());
      reject(new ProviderTimeoutError());
    }, options.providerTimeoutMs);
  });

  try {
    return await Promise.race([
      provider.forecast(input, controller.signal),
      requestTimeout,
      providerTimeout,
    ]);
  } finally {
    clearTimeout(requestTimer);
    clearTimeout(providerTimer);
  }
}
