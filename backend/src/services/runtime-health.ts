// Runtime health tracking utilities
import type { Runtime, RuntimeStatus } from '../models/runtime';

const STALE_THRESHOLD_MS = 60000; // 1 minute
const OFFLINE_THRESHOLD_MS = 300000; // 5 minutes
const RECONNECT_THRESHOLD_MS = 120000; // 2 minutes

export function calculateRuntimeHealth(runtime: Runtime): RuntimeStatus {
  const now = Date.now();
  const timeSinceLastSeen = now - runtime.last_seen_at;

  if (timeSinceLastSeen > OFFLINE_THRESHOLD_MS) {
    return 'offline';
  }
  if (timeSinceLastSeen > RECONNECT_THRESHOLD_MS && runtime.status === 'online') {
    return 'reconnecting';
  }
  if (timeSinceLastSeen > STALE_THRESHOLD_MS) {
    return 'stale';
  }
  return runtime.status;
}

export function updateRuntimeHealth(runtime: Runtime): void {
  runtime.status = calculateRuntimeHealth(runtime);
}

export function getRuntimeHealthInfo(runtime: Runtime): {
  status: RuntimeStatus;
  last_seen_ms_ago: number;
  is_stale: boolean;
  is_offline: boolean;
  is_reconnecting: boolean;
} {
  const now = Date.now();
  const last_seen_ms_ago = now - runtime.last_seen_at;
  const status = calculateRuntimeHealth(runtime);
  return {
    status,
    last_seen_ms_ago,
    is_stale: last_seen_ms_ago > STALE_THRESHOLD_MS,
    is_offline: last_seen_ms_ago > OFFLINE_THRESHOLD_MS,
    is_reconnecting: status === 'reconnecting',
  };
}
