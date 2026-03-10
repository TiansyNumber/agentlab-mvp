// Connector V1 pairing/binding API
import type { Runtime } from '../models/runtime';
import { getRuntime } from './runtime-registry';

const PAIRING_EXPIRY_MS = 300000; // 5 minutes

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

  // Check expiry
  if (Date.now() - pairing.created_at > PAIRING_EXPIRY_MS) {
    pairings.delete(code);
    throw new Error('Pairing code expired');
  }

  const runtime = await getRuntime(pairing.runtime_id);
  if (!runtime) throw new Error('Runtime not found');

  runtime.device_id = device_id;
  runtime.paired_at = Date.now();
  runtime.pairing_code = undefined;
  runtime.status = 'online';
  pairings.delete(code);

  return runtime;
}

export function getPairingStatus(code: string): { valid: boolean; expires_in_ms?: number } {
  const pairing = pairings.get(code);
  if (!pairing) return { valid: false };
  const age = Date.now() - pairing.created_at;
  if (age > PAIRING_EXPIRY_MS) {
    pairings.delete(code);
    return { valid: false };
  }
  return { valid: true, expires_in_ms: PAIRING_EXPIRY_MS - age };
}
