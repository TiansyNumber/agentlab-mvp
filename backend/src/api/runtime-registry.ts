// Runtime Registry API - Cloudflare Workers compatible
import type { Runtime, RuntimeHeartbeat, RuntimeRegistration } from '../models/runtime';

// In-memory store (replace with D1/KV in production)
const runtimes = new Map<string, Runtime>();

function validateRegistration(req: RuntimeRegistration): void {
  if (!req.display_name?.trim()) throw new Error('display_name required');
  if (!req.endpoint?.trim()) throw new Error('endpoint required');
  if (!req.owner?.trim()) throw new Error('owner required');
  if (req.max_concurrency < 1) throw new Error('max_concurrency must be >= 1');
}

export async function registerRuntime(req: RuntimeRegistration): Promise<Runtime> {
  validateRegistration(req);

  const runtime: Runtime = {
    runtime_id: crypto.randomUUID(),
    ...req,
    status: 'online',
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
