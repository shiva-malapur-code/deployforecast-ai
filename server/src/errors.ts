import { ZodError } from 'zod';
import {
  API_ERROR_DEFINITIONS,
  createApiError,
  type ApiError,
  type ApiErrorCode,
} from '@deploy-forecast/shared';
import { ProviderUnavailableError } from './providers/ai-provider.js';
import { ProviderOutputError } from './providers/provider-output.js';

export class RequestTimeoutError extends Error {
  constructor() {
    super('Forecast request timed out.');
    this.name = 'RequestTimeoutError';
  }
}

export class ProviderTimeoutError extends Error {
  constructor() {
    super('Forecast provider timed out.');
    this.name = 'ProviderTimeoutError';
  }
}

export interface MappedApiError {
  status: number;
  payload: ApiError;
}

export function mapApiError(error: unknown, requestId: string): MappedApiError {
  let code: ApiErrorCode = 'INTERNAL_ERROR';
  let details: unknown;

  if (error instanceof ZodError || isRequestPayloadError(error)) {
    code = 'INVALID_REQUEST';
    details = error instanceof ZodError ? error.flatten() : undefined;
  } else if (error instanceof ProviderOutputError) {
    code = 'INVALID_PROVIDER_RESPONSE';
  } else if (error instanceof ProviderTimeoutError) {
    code = 'PROVIDER_TIMEOUT';
  } else if (error instanceof RequestTimeoutError) {
    code = 'REQUEST_TIMEOUT';
  } else if (error instanceof ProviderUnavailableError) {
    code = 'PROVIDER_UNAVAILABLE';
  }

  return {
    status: API_ERROR_DEFINITIONS[code].status,
    payload: createApiError(code, requestId, details),
  };
}

function isRequestPayloadError(error: unknown): boolean {
  if (typeof error !== 'object' || error === null || !('status' in error)) return false;
  const status = (error as { status?: unknown }).status;
  return status === 400 || status === 413;
}
