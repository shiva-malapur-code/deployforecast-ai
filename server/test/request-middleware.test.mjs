import assert from 'node:assert/strict';
import test from 'node:test';
import { ApiErrorSchema } from '@deploy-forecast/shared';
import { createRateLimiter, requestIdMiddleware } from '../dist/request-middleware.js';

function createResponse() {
  return {
    headers: new Map(),
    locals: {},
    statusCode: 200,
    payload: undefined,
    setHeader(name, value) {
      this.headers.set(name, String(value));
      return this;
    },
    status(value) {
      this.statusCode = value;
      return this;
    },
    json(value) {
      this.payload = value;
      return this;
    },
  };
}

test('assigns request IDs and rate limits through the shared error contract', () => {
  const request = { ip: 'test-client' };
  const response = createResponse();
  let continued = 0;
  requestIdMiddleware(request, response, () => {
    continued += 1;
  });

  assert.equal(typeof response.locals.requestId, 'string');
  assert.equal(response.headers.get('X-Request-ID'), response.locals.requestId);

  const limiter = createRateLimiter(60_000, 1);
  limiter(request, response, () => {
    continued += 1;
  });
  limiter(request, response, () => {
    continued += 1;
  });

  assert.equal(continued, 2);
  assert.equal(response.statusCode, 429);
  assert.equal(response.payload.code, 'RATE_LIMITED');
  assert.equal(ApiErrorSchema.safeParse(response.payload).success, true);
});
