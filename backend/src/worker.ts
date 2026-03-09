// Cloudflare Workers entry point for AgentLab Backend API
// This layer is Cloudflare-ready and handles HTTP requests

import { registerRuntime, updateHeartbeat, listRuntimes, getRuntime } from './api/runtime-registry';
import { startExperiment, stopExperiment, getExperiment, getExperimentEvents } from './api/experiment-control';

export default {
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    try {
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
        const owner = url.searchParams.get('owner') || undefined;
        const runtimes = await listRuntimes(owner);
        return Response.json(runtimes.map(r => ({
          id: r.runtime_id,
          owner: r.owner,
          type: r.runtime_type,
          mode: r.runtime_mode,
          capabilities: r.capabilities,
          status: r.status,
          last_heartbeat: new Date(r.last_heartbeat_at).toISOString(),
          device_id: r.device_id,
          gateway_url: r.gateway_url
        })));
      }

      // Experiment Control endpoints
      if (url.pathname === '/api/experiments/start' && request.method === 'POST') {
        const body = await request.json();
        const runtime = await getRuntime(body.runtime_id);
        if (!runtime) return Response.json({ error: 'Runtime not found' }, { status: 404 });
        const exp = await startExperiment(body.runtime_id, body.owner, body.task, runtime);
        return Response.json({
          id: exp.experiment_id,
          runtime_id: exp.runtime_id,
          owner: exp.owner,
          task: exp.task,
          status: exp.status,
          created_at: new Date(exp.created_at).toISOString()
        });
      }

      if (url.pathname.match(/^\/api\/experiments\/(.+)\/stop$/) && request.method === 'POST') {
        const id = url.pathname.split('/')[3];
        await stopExperiment(id);
        return Response.json({ ok: true });
      }

      if (url.pathname.match(/^\/api\/experiments\/(.+)\/events$/) && request.method === 'GET') {
        const id = url.pathname.split('/')[3];
        const events = await getExperimentEvents(id);
        return Response.json(events.map(e => ({
          id: e.event_id,
          experiment_id: e.experiment_id,
          type: e.type,
          message: JSON.stringify(e.data),
          timestamp: new Date(e.timestamp).toISOString()
        })));
      }

      return new Response('Not found', { status: 404 });
    } catch (err) {
      return Response.json({ error: (err as Error).message }, { status: 500 });
    }
  }
};
