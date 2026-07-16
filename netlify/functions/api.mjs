import worker from '../../dist/server/index.js';

const unavailableAssets = {
  fetch: async () => new globalThis.Response('Not found', { status: 404 }),
};

export default async function handleApiRequest(request) {
  return worker.fetch(request, { ASSETS: unavailableAssets });
}

export const config = {
  path: '/api/*',
};
