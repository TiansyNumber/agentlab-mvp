// Connector V1 pairing/binding API
import type { Runtime } from '../models/runtime';
import { getRuntime } from './runtime-registry';

const pairings = new Map<string, { runtime_id: string; code: string; created_at: number }>();

export async function generatePairingCode(runtime_id: string): Promise<string> {
  const runtime = await getRuntime(runtime_id);
  if (!runtime) throw new Error('Runtime not found');

  const code = Math.random().toString(36).substring(2, 8).toUpperCase();
  pairings.set(code, { runtime_id, code, created_at: Date.now() });

  runtime.pairing_code = code;
  return code;
}

export async function completePairing(code: string, device_id: string): Promise<Runtime> {
  const pairing = pairings.get(code);
  if (!pairing) throw new Error('Invalid pairing code');

  const runtime = await getRuntime(pairing.runtime_id);
  if (!runtime) throw new Error('Runtime not found');

  runtime.device_id = device_id;
  runtime.paired_at = Date.now();
  runtime.pairing_code = undefined;
  pairings.delete(code);

  return runtime;
}
