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
  if (timeSinceLastSeen > RECONNECT_THRESHOLD_MS) {
    return 'reconnecting';
  }
  if (timeSinceLastSeen > STALE_THRESHOLD_MS) {
    return 'stale';
  }

  // Check occupancy - if has active experiment, mark as busy
  if (runtime.active_experiment_id) {
    return 'online'; // Keep base status, occupancy shown separately
  }

  return 'online';
}

export function updateRuntimeHealth(runtime: Runtime): void {
  runtime.status = calculateRuntimeHealth(runtime);
}

export function markRuntimeBusy(runtime: Runtime, experiment_id: string): void {
  runtime.active_experiment_id = experiment_id;
  runtime.active_experiment_started_at = Date.now();
}

export function markRuntimeFree(runtime: Runtime): void {
  runtime.active_experiment_id = undefined;
  runtime.active_experiment_started_at = undefined;
}

export function getRuntimeHealthInfo(runtime: Runtime): {
  status: RuntimeStatus;
  last_seen_ms_ago: number;
  is_stale: boolean;
  is_offline: boolean;
  is_reconnecting: boolean;
  is_busy: boolean;
  active_experiment_id?: string;
  active_experiment_duration_ms?: number;
} {
  const now = Date.now();
  const last_seen_ms_ago = now - runtime.last_seen_at;
  const status = calculateRuntimeHealth(runtime);
  const is_busy = !!runtime.active_experiment_id;
  const active_experiment_duration_ms = runtime.active_experiment_started_at
    ? now - runtime.active_experiment_started_at
    : undefined;

  return {
    status,
    last_seen_ms_ago,
    is_stale: last_seen_ms_ago > STALE_THRESHOLD_MS,
    is_offline: last_seen_ms_ago > OFFLINE_THRESHOLD_MS,
    is_reconnecting: status === 'reconnecting',
    is_busy,
    active_experiment_id: runtime.active_experiment_id,
    active_experiment_duration_ms,
  };
}
