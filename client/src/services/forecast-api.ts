import type { EngineeringForecast, ForecastRequest } from '@deploy-forecast/shared';

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? '';

export async function createForecast(input: ForecastRequest): Promise<EngineeringForecast> {
  const response = await fetch(`${apiBaseUrl}/api/forecast`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(payload?.error ?? 'Unable to generate the forecast.');
  }

  return response.json() as Promise<EngineeringForecast>;
}
