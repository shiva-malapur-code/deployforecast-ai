import type {
  EngineeringForecast,
  ForecastRequest,
  PreventiveFix,
  PreventiveFixRequest,
} from '@deploy-forecast/shared';
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
  return executeProviderOperation((signal) => provider.forecast(input, signal), options);
}

export async function executeProviderPreventiveFix(
  provider: AIProvider,
  input: PreventiveFixRequest,
  options: ProviderExecutionOptions,
): Promise<PreventiveFix> {
  return executeProviderOperation(
    (signal) => provider.generatePreventiveFix(input, signal),
    options,
  );
}

async function executeProviderOperation<T>(
  operation: (signal: AbortSignal) => Promise<T>,
  options: ProviderExecutionOptions,
): Promise<T> {
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
    return await Promise.race([operation(controller.signal), requestTimeout, providerTimeout]);
  } finally {
    clearTimeout(requestTimer);
    clearTimeout(providerTimer);
  }
}
