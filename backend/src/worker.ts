// Cloudflare Workers entry point for AgentLab Backend API
// This layer is Cloudflare-ready and handles HTTP requests

import { registerRuntime, updateHeartbeat, listRuntimes, getRuntime } from './api/runtime-registry';
import { startExperiment, stopExperiment, getExperiment, getExperimentEvents } from './api/experiment-control';

export default {
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    // Runtime Registry endpoints
    if (url.pathname === '/api/runtimes' && request.method === 'POST') {
      const body = await request.json();
      const runtime = await registerRuntime(body);
      return Response.json(runtime);
    }

    if (url.pathname === '/api/runtimes/heartbeat' && request.method === 'POST') {
      const body = await request.json();
      await updateHeartbeat(body);
      return Response.json({ ok: true });
    }

    if (url.pathname === '/api/runtimes' && request.method === 'GET') {
      const owner = url.searchParams.get('owner') || 'default';
      const runtimes = await listRuntimes(owner);
      return Response.json(runtimes);
    }

    // Experiment Control endpoints
    if (url.pathname === '/api/experiments/start' && request.method === 'POST') {
      const body = await request.json();
      const exp = await startExperiment(body.runtime_id, body.owner, body.task);
      return Response.json(exp);
    }

    if (url.pathname.match(/^\/api\/experiments\/(.+)\/stop$/) && request.method === 'POST') {
      const id = url.pathname.split('/')[3];
      await stopExperiment(id);
      return Response.json({ ok: true });
    }

    if (url.pathname.match(/^\/api\/experiments\/(.+)\/events$/) && request.method === 'GET') {
      const id = url.pathname.split('/')[3];
      const events = await getExperimentEvents(id);
      return Response.json(events);
    }

    return new Response('Not found', { status: 404 });
  }
};
