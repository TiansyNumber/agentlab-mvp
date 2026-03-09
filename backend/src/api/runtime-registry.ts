// Runtime Registry API - Cloudflare Workers compatible
import type { Runtime, RuntimeHeartbeat, RuntimeRegistration } from '../models/runtime';

// In-memory store (replace with D1/KV in production)
const runtimes = new Map<string, Runtime>();

export async function registerRuntime(req: any): Promise<Runtime> {
  if (!req.owner?.trim()) throw new Error('owner required');

  const runtime: Runtime = {
    runtime_id: crypto.randomUUID(),
    runtime_type: (req.type || 'openclaw') as any,
    display_name: req.display_name || `Runtime ${Date.now()}`,
    endpoint: req.endpoint || 'https://openclaw-gateway.example.com',
    auth_mode: 'none',
    capabilities: req.capabilities || [],
    status: 'online',
    owner: req.owner,
    max_concurrency: req.max_concurrency || 1,
    last_heartbeat_at: Date.now(),
    created_at: Date.now(),
  };
  runtimes.set(runtime.runtime_id, runtime);
  return runtime;
}

export async function updateHeartbeat(heartbeat: RuntimeHeartbeat): Promise<void> {
  const runtime = runtimes.get(heartbeat.runtime_id);
  if (!runtime) throw new Error('Runtime not found');
  runtime.status = heartbeat.status;
  runtime.last_heartbeat_at = heartbeat.timestamp;
}

export async function listRuntimes(owner?: string): Promise<Runtime[]> {
  const all = Array.from(runtimes.values());
  return owner ? all.filter(r => r.owner === owner) : all;
}

export async function getRuntime(runtime_id: string): Promise<Runtime | null> {
  return runtimes.get(runtime_id) || null;
}

export async function unregisterRuntime(runtime_id: string): Promise<void> {
  if (!runtimes.has(runtime_id)) throw new Error('Runtime not found');
  runtimes.delete(runtime_id);
}
