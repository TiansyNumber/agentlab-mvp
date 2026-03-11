// Cloudflare Workers entry point for AgentLab Backend API
// This layer is Cloudflare-ready and handles HTTP requests

import { registerRuntime, updateHeartbeat, listRuntimes, getRuntime, markRuntimeDisconnected } from './api/runtime-registry';
import { startExperiment, stopExperiment, getExperiment, getExperimentEvents, retryExperiment, listExperiments } from './api/experiment-control';
import { compareExperiments } from './api/experiment-compare';
import { generatePairingCode, completePairing, getPairingStatus, requestPairing, completePairingWithGateway } from './api/connector-pairing';
import { getRuntimeHealthInfo } from './services/runtime-health';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export default {
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    try {
      // Health check
      if (url.pathname === '/health' && request.method === 'GET') {
        return Response.json({ status: 'ok' }, { headers: corsHeaders });
      }

      // Runtime Registry endpoints
      if (url.pathname === '/api/runtimes' && request.method === 'POST') {
        const body = await request.json();
        const runtime = await registerRuntime(body);
        return Response.json(runtime, { headers: corsHeaders });
      }

      if (url.pathname === '/api/runtimes/heartbeat' && request.method === 'POST') {
        const body = await request.json();
        await updateHeartbeat(body);
        return Response.json({ ok: true }, { headers: corsHeaders });
      }

      if (url.pathname === '/api/runtimes' && request.method === 'GET') {
        const owner = url.searchParams.get('owner') || undefined;
        const runtimes = await listRuntimes(owner);
        return Response.json(runtimes.map(r => {
          const health = getRuntimeHealthInfo(r);
          return {
            id: r.runtime_id,
            owner: r.owner,
            type: r.runtime_type,
            mode: r.runtime_mode,
            capabilities: r.capabilities,
            status: health.status,
            last_heartbeat: new Date(r.last_heartbeat_at).toISOString(),
            last_seen: new Date(r.last_seen_at).toISOString(),
            last_seen_ms_ago: health.last_seen_ms_ago,
            is_stale: health.is_stale,
            is_offline: health.is_offline,
            is_busy: health.is_busy,
            active_experiment_id: health.active_experiment_id,
            active_experiment_duration_ms: health.active_experiment_duration_ms,
            device_id: r.device_id,
            gateway_url: r.gateway_url,
            paired_at: r.paired_at ? new Date(r.paired_at).toISOString() : undefined,
          };
        }), { headers: corsHeaders });
      }

      // GET single runtime with health info
      if (url.pathname.match(/^\/api\/runtimes\/[^/]+$/) && request.method === 'GET') {
        const runtime_id = url.pathname.split('/')[3];
        const r = await getRuntime(runtime_id);
        if (!r) return Response.json({ error: 'Runtime not found' }, { status: 404, headers: corsHeaders });
        const health = getRuntimeHealthInfo(r);
        return Response.json({
          id: r.runtime_id,
          owner: r.owner,
          type: r.runtime_type,
          mode: r.runtime_mode,
          capabilities: r.capabilities,
          status: health.status,
          last_heartbeat: new Date(r.last_heartbeat_at).toISOString(),
          last_seen: new Date(r.last_seen_at).toISOString(),
          last_seen_ms_ago: health.last_seen_ms_ago,
          is_stale: health.is_stale,
          is_offline: health.is_offline,
          is_busy: health.is_busy,
          active_experiment_id: health.active_experiment_id,
          active_experiment_duration_ms: health.active_experiment_duration_ms,
          device_id: r.device_id,
          gateway_url: r.gateway_url,
          paired_at: r.paired_at ? new Date(r.paired_at).toISOString() : undefined,
        }, { headers: corsHeaders });
      }

      // Mark runtime disconnected
      if (url.pathname.match(/^\/api\/runtimes\/[^/]+\/disconnect$/) && request.method === 'POST') {
        const runtime_id = url.pathname.split('/')[3];
        await markRuntimeDisconnected(runtime_id);
        return Response.json({ ok: true }, { headers: corsHeaders });
      }

      // Experiment Control endpoints
      if (url.pathname === '/api/experiments/start' && request.method === 'POST') {
        const body = await request.json();
        const runtime = await getRuntime(body.runtime_id);
        if (!runtime) return Response.json({ error: 'Runtime not found' }, { status: 404, headers: corsHeaders });
        const exp = await startExperiment(body.runtime_id, body.owner, body.task, runtime, body.gateway_token);
        return Response.json({
          id: exp.experiment_id,
          runtime_id: exp.runtime_id,
          owner: exp.owner,
          task: exp.task,
          status: exp.status,
          created_at: new Date(exp.created_at).toISOString()
        }, { headers: corsHeaders });
      }

      if (url.pathname.match(/^\/api\/experiments\/(.+)\/stop$/) && request.method === 'POST') {
        const id = url.pathname.split('/')[3];
        await stopExperiment(id);
        return Response.json({ ok: true }, { headers: corsHeaders });
      }

      if (url.pathname.match(/^\/api\/experiments\/(.+)\/retry$/) && request.method === 'POST') {
        const id = url.pathname.split('/')[3];
        const newExp = await retryExperiment(id);
        return Response.json({
          id: newExp.experiment_id,
          runtime_id: newExp.runtime_id,
          owner: newExp.owner,
          task: newExp.task,
          status: newExp.status,
          created_at: new Date(newExp.created_at).toISOString()
        }, { headers: corsHeaders });
      }

      if (url.pathname.match(/^\/api\/experiments\/(.+)\/events$/) && request.method === 'GET') {
        const id = url.pathname.split('/')[3];
        const since = url.searchParams.get('since');
        const events = await getExperimentEvents(id, since ? parseInt(since) : undefined);
        return Response.json(events.map(e => ({
          id: e.event_id,
          experiment_id: e.experiment_id,
          type: e.type,
          message: JSON.stringify(e.data),
          timestamp: new Date(e.timestamp).toISOString()
        })), { headers: corsHeaders });
      }

      if (url.pathname === '/api/experiments' && request.method === 'GET') {
        const owner = url.searchParams.get('owner') || undefined;
        const runtime_id = url.searchParams.get('runtime_id') || undefined;
        const exps = await listExperiments(owner, runtime_id);
        return Response.json(exps.map(e => ({
          id: e.experiment_id,
          runtime_id: e.runtime_id,
          owner: e.owner,
          task: e.task,
          status: e.status,
          phase: e.phase,
          failure_reason: e.failure_reason,
          created_at: new Date(e.created_at).toISOString(),
          started_at: e.started_at ? new Date(e.started_at).toISOString() : undefined,
          completed_at: e.completed_at ? new Date(e.completed_at).toISOString() : undefined,
        })), { headers: corsHeaders });
      }

      if (url.pathname === '/api/experiments/compare' && request.method === 'POST') {
        const body = await request.json();
        const comparison = await compareExperiments(body.experiment_ids);
        return Response.json(comparison, { headers: corsHeaders });
      }

      if (url.pathname.match(/^\/api\/runtimes\/(.+)\/pair$/) && request.method === 'POST') {
        const runtime_id = url.pathname.split('/')[3];
        const code = await generatePairingCode(runtime_id);
        return Response.json({ code }, { headers: corsHeaders });
      }

      if (url.pathname === '/api/connector/pair' && request.method === 'POST') {
        const body = await request.json();
        const runtime = await completePairing(body.code, body.device_id);
        return Response.json({ runtime_id: runtime.runtime_id, paired: true }, { headers: corsHeaders });
      }

      if (url.pathname.match(/^\/api\/connector\/pair\/(.+)\/status$/) && request.method === 'GET') {
        const code = url.pathname.split('/')[4];
        const status = getPairingStatus(code);
        return Response.json(status, { headers: corsHeaders });
      }

      if (url.pathname === '/api/pairing/request' && request.method === 'POST') {
        const body = await request.json();
        const result = await requestPairing(body);
        return Response.json(result, { headers: corsHeaders });
      }

      if (url.pathname === '/api/pairing/complete' && request.method === 'POST') {
        const body = await request.json();
        const runtime = await completePairingWithGateway(body.runtime_id, body.gateway_url);
        return Response.json(runtime, { headers: corsHeaders });
      }

      return new Response('Not found', { status: 404, headers: corsHeaders });
    } catch (err) {
      return Response.json({ error: (err as Error).message }, { status: 500, headers: corsHeaders });
    }
  }
};
