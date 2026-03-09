// Runtime Registry API - Cloudflare Workers compatible
import type { Runtime, RuntimeHeartbeat, RuntimeRegistration } from '../models/runtime';

// In-memory store (replace with D1/KV in production)
const runtimes = new Map<string, Runtime>();

export async function registerRuntime(req: RuntimeRegistration): Promise<Runtime> {
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

export async function listRuntimes(owner: string): Promise<Runtime[]> {
  return Array.from(runtimes.values()).filter(r => r.owner === owner);
}

export async function getRuntime(runtime_id: string): Promise<Runtime | null> {
  return runtimes.get(runtime_id) || null;
}
