import { createDemoForecast, type ForecastRequest } from '@deploy-forecast/shared';

interface Environment {
  ASSETS: { fetch(request: Request): Promise<Response> };
}

export default {
  async fetch(request: Request, env: Environment): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === '/api/health') {
      return Response.json({ status: 'ok' });
    }

    if (url.pathname === '/api/forecast' && request.method === 'POST') {
      const input = (await request.json()) as Partial<ForecastRequest>;
      if (typeof input.code !== 'string' || input.code.length < 20) {
        return Response.json(
          { error: 'Provide at least 20 characters of source code.' },
          { status: 400 },
        );
      }
      return Response.json(createDemoForecast(input as ForecastRequest, 'public-demo'));
    }

    const assetResponse = await env.ASSETS.fetch(request);
    if (assetResponse.status !== 404) return assetResponse;

    return env.ASSETS.fetch(new Request(new URL('/index.html', request.url), request));
  },
};
