import {
  ApiErrorSchema,
  createDemoForecast,
  EngineeringForecastSchema,
  ForecastRequestSchema,
  type EngineeringForecast,
  type ForecastRequest,
} from '@deploy-forecast/shared';

interface Environment {
  ASSETS: { fetch(request: Request): Promise<Response> };
}

type HostedForecastFactory = (
  input: ForecastRequest,
) => EngineeringForecast | Promise<EngineeringForecast>;

const publicDemoForecast: HostedForecastFactory = (input) =>
  createDemoForecast(input, 'public-demo');

function errorResponse(error: string, status: number, details?: unknown): Response {
  return Response.json(ApiErrorSchema.parse({ error, details }), { status });
}

export function createWorkerHandler(forecastFactory: HostedForecastFactory = publicDemoForecast) {
  return {
    async fetch(request: Request, env: Environment): Promise<Response> {
      const url = new URL(request.url);

      if (url.pathname === '/api/health') {
        return Response.json({ status: 'ok' });
      }

      if (url.pathname === '/api/forecast' && request.method === 'POST') {
        let body: unknown;
        try {
          body = await request.json();
        } catch {
          return errorResponse('Invalid forecast request', 400);
        }

        const input = ForecastRequestSchema.safeParse(body);
        if (!input.success) {
          return errorResponse('Invalid forecast request', 400, input.error.flatten());
        }

        try {
          const forecast = EngineeringForecastSchema.parse(await forecastFactory(input.data));
          return Response.json(forecast);
        } catch (error) {
          console.error('Hosted forecast produced an invalid response', error);
          return errorResponse('Forecast provider returned an invalid response.', 502);
        }
      }

      const assetResponse = await env.ASSETS.fetch(request);
      if (assetResponse.status !== 404) return assetResponse;

      return env.ASSETS.fetch(new Request(new URL('/index.html', request.url), request));
    },
  };
}

export default createWorkerHandler();
