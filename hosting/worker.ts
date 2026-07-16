import {
  API_ERROR_DEFINITIONS,
  createApiError,
  createDemoForecast,
  createDemoGeneratedTests,
  createDemoPreventiveFix,
  EngineeringForecastSchema,
  ForecastRequestSchema,
  GeneratedTestsRequestSchema,
  GeneratedTestsSchema,
  PreventiveFixRequestSchema,
  PreventiveFixSchema,
  validateScenarioForecast,
  validatePreventiveFixEvidence,
  validateGeneratedTestEvidence,
  type EngineeringForecast,
  type ForecastRequest,
  type GeneratedTests,
  type GeneratedTestsRequest,
  type PreventiveFix,
  type PreventiveFixRequest,
} from '@deploy-forecast/shared';

interface Environment {
  ASSETS: { fetch(request: Request): Promise<Response> };
}

type HostedForecastFactory = (
  input: ForecastRequest,
  signal?: AbortSignal,
) => EngineeringForecast | Promise<EngineeringForecast>;

type HostedPreventiveFixFactory = (
  input: PreventiveFixRequest,
  signal?: AbortSignal,
) => PreventiveFix | Promise<PreventiveFix>;

type HostedGeneratedTestsFactory = (
  input: GeneratedTestsRequest,
  signal?: AbortSignal,
) => GeneratedTests | Promise<GeneratedTests>;

interface WorkerOptions {
  requestTimeoutMs?: number;
  providerTimeoutMs?: number;
  rateLimitWindowMs?: number;
  rateLimitMax?: number;
  preventiveFixFactory?: HostedPreventiveFixFactory;
  generatedTestsFactory?: HostedGeneratedTestsFactory;
}

const publicDemoForecast: HostedForecastFactory = (input) =>
  createDemoForecast(input, 'public-demo');
const publicDemoPreventiveFix: HostedPreventiveFixFactory = (input) =>
  createDemoPreventiveFix(input, 'public-demo');
const publicDemoGeneratedTests: HostedGeneratedTestsFactory = (input) =>
  createDemoGeneratedTests(input, 'public-demo');

function errorResponse(
  code: keyof typeof API_ERROR_DEFINITIONS,
  requestId: string,
  details?: unknown,
): Response {
  return Response.json(createApiError(code, requestId, details), {
    status: API_ERROR_DEFINITIONS[code].status,
    headers: { 'X-Request-ID': requestId },
  });
}

export function createWorkerHandler(
  forecastFactory: HostedForecastFactory = publicDemoForecast,
  options: WorkerOptions = {},
) {
  const requestTimeoutMs = options.requestTimeoutMs ?? 20_000;
  const providerTimeoutMs = options.providerTimeoutMs ?? 15_000;
  const rateLimitWindowMs = options.rateLimitWindowMs ?? 60_000;
  const rateLimitMax = options.rateLimitMax ?? 20;
  const preventiveFixFactory = options.preventiveFixFactory ?? publicDemoPreventiveFix;
  const generatedTestsFactory = options.generatedTestsFactory ?? publicDemoGeneratedTests;
  const clients = new Map<string, { count: number; resetAt: number }>();

  const exceedsRateLimit = (request: Request) => {
    const clientKey =
      request.headers.get('CF-Connecting-IP') ??
      request.headers.get('X-Forwarded-For') ??
      'unknown';
    const now = Date.now();
    const current = clients.get(clientKey);
    const rate =
      !current || current.resetAt <= now ? { count: 0, resetAt: now + rateLimitWindowMs } : current;
    rate.count += 1;
    clients.set(clientKey, rate);
    return rate.count > rateLimitMax;
  };

  return {
    async fetch(request: Request, env: Environment): Promise<Response> {
      const url = new URL(request.url);
      const requestId = crypto.randomUUID();

      if (url.pathname === '/api/health') {
        return Response.json({ status: 'ok' }, { headers: { 'X-Request-ID': requestId } });
      }

      if (url.pathname === '/api/forecast' && request.method === 'POST') {
        if (exceedsRateLimit(request)) {
          return errorResponse('RATE_LIMITED', requestId);
        }

        let body: unknown;
        try {
          body = await request.json();
        } catch {
          return errorResponse('INVALID_REQUEST', requestId);
        }

        const input = ForecastRequestSchema.safeParse(body);
        if (!input.success) {
          return errorResponse('INVALID_REQUEST', requestId, input.error.flatten());
        }

        try {
          const forecast = EngineeringForecastSchema.parse(
            await executeHostedForecast(forecastFactory, input.data, {
              requestTimeoutMs,
              providerTimeoutMs,
            }),
          );
          if (!validateScenarioForecast(forecast, input.data)) {
            console.error(`[${requestId}] InvalidProviderResponse`);
            return errorResponse('INVALID_PROVIDER_RESPONSE', requestId);
          }
          return Response.json(forecast, { headers: { 'X-Request-ID': requestId } });
        } catch (error) {
          if (error instanceof HostedProviderTimeoutError) {
            return errorResponse('PROVIDER_TIMEOUT', requestId);
          }
          if (error instanceof HostedRequestTimeoutError) {
            return errorResponse('REQUEST_TIMEOUT', requestId);
          }
          if (error instanceof Error && error.name === 'ZodError') {
            console.error(`[${requestId}] InvalidProviderResponse`);
            return errorResponse('INVALID_PROVIDER_RESPONSE', requestId);
          }
          console.error(`[${requestId}] HostedForecastError`);
          return errorResponse('INTERNAL_ERROR', requestId);
        }
      }

      if (url.pathname === '/api/preventive-fix' && request.method === 'POST') {
        if (exceedsRateLimit(request)) return errorResponse('RATE_LIMITED', requestId);

        let body: unknown;
        try {
          body = await request.json();
        } catch {
          return errorResponse('INVALID_REQUEST', requestId);
        }

        const input = PreventiveFixRequestSchema.safeParse(body);
        if (!input.success) {
          return errorResponse('INVALID_REQUEST', requestId, input.error.flatten());
        }

        try {
          const fix = PreventiveFixSchema.parse(
            await executeHostedOperation((signal) => preventiveFixFactory(input.data, signal), {
              requestTimeoutMs,
              providerTimeoutMs,
            }),
          );
          if (!validatePreventiveFixEvidence(fix, input.data)) {
            console.error(`[${requestId}] InvalidProviderResponse`);
            return errorResponse('INVALID_PROVIDER_RESPONSE', requestId);
          }
          return Response.json(fix, { headers: { 'X-Request-ID': requestId } });
        } catch (error) {
          if (error instanceof HostedProviderTimeoutError) {
            return errorResponse('PROVIDER_TIMEOUT', requestId);
          }
          if (error instanceof HostedRequestTimeoutError) {
            return errorResponse('REQUEST_TIMEOUT', requestId);
          }
          if (error instanceof Error && error.name === 'ZodError') {
            console.error(`[${requestId}] InvalidProviderResponse`);
            return errorResponse('INVALID_PROVIDER_RESPONSE', requestId);
          }
          console.error(`[${requestId}] HostedPreventiveFixError`);
          return errorResponse('INTERNAL_ERROR', requestId);
        }
      }

      if (url.pathname === '/api/generated-tests' && request.method === 'POST') {
        if (exceedsRateLimit(request)) return errorResponse('RATE_LIMITED', requestId);

        let body: unknown;
        try {
          body = await request.json();
        } catch {
          return errorResponse('INVALID_REQUEST', requestId);
        }

        const input = GeneratedTestsRequestSchema.safeParse(body);
        if (!input.success) {
          return errorResponse('INVALID_REQUEST', requestId, input.error.flatten());
        }

        try {
          const tests = GeneratedTestsSchema.parse(
            await executeHostedOperation((signal) => generatedTestsFactory(input.data, signal), {
              requestTimeoutMs,
              providerTimeoutMs,
            }),
          );
          if (!validateGeneratedTestEvidence(tests, input.data)) {
            console.error(`[${requestId}] InvalidProviderResponse`);
            return errorResponse('INVALID_PROVIDER_RESPONSE', requestId);
          }
          return Response.json(tests, { headers: { 'X-Request-ID': requestId } });
        } catch (error) {
          if (error instanceof HostedProviderTimeoutError) {
            return errorResponse('PROVIDER_TIMEOUT', requestId);
          }
          if (error instanceof HostedRequestTimeoutError) {
            return errorResponse('REQUEST_TIMEOUT', requestId);
          }
          if (error instanceof Error && error.name === 'ZodError') {
            console.error(`[${requestId}] InvalidProviderResponse`);
            return errorResponse('INVALID_PROVIDER_RESPONSE', requestId);
          }
          console.error(`[${requestId}] HostedGeneratedTestsError`);
          return errorResponse('INTERNAL_ERROR', requestId);
        }
      }

      const assetResponse = await env.ASSETS.fetch(request);
      if (assetResponse.status !== 404) return assetResponse;

      return env.ASSETS.fetch(new Request(new URL('/index.html', request.url), request));
    },
  };
}

class HostedRequestTimeoutError extends Error {}
class HostedProviderTimeoutError extends Error {}

async function executeHostedForecast(
  forecastFactory: HostedForecastFactory,
  input: ForecastRequest,
  options: Required<Pick<WorkerOptions, 'requestTimeoutMs' | 'providerTimeoutMs'>>,
) {
  return executeHostedOperation((signal) => forecastFactory(input, signal), options);
}

async function executeHostedOperation<T>(
  operation: (signal: AbortSignal) => T | Promise<T>,
  options: Required<Pick<WorkerOptions, 'requestTimeoutMs' | 'providerTimeoutMs'>>,
) {
  const controller = new AbortController();
  let requestTimer: ReturnType<typeof setTimeout> | undefined;
  let providerTimer: ReturnType<typeof setTimeout> | undefined;
  const requestTimeout = new Promise<never>((_, reject) => {
    requestTimer = setTimeout(() => {
      const error = new HostedRequestTimeoutError();
      controller.abort(error);
      reject(error);
    }, options.requestTimeoutMs);
  });
  const providerTimeout = new Promise<never>((_, reject) => {
    providerTimer = setTimeout(() => {
      const error = new HostedProviderTimeoutError();
      controller.abort(error);
      reject(error);
    }, options.providerTimeoutMs);
  });

  try {
    return await Promise.race([operation(controller.signal), requestTimeout, providerTimeout]);
  } finally {
    clearTimeout(requestTimer);
    clearTimeout(providerTimer);
  }
}

export default createWorkerHandler();
