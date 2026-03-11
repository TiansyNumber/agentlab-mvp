// Experiment Manager - connects experiments to runtime adapters
import type { Experiment, ExperimentEvent } from '../models/experiment';
import type { Runtime } from '../models/runtime';
import { OpenClawAdapter, type OpenClawConfig } from '../adapters/openclaw';
import { markRuntimeBusy, markRuntimeFree } from './runtime-health';

const activeAdapters = new Map<string, OpenClawAdapter>();
// Track connector-dispatched experiments for stop support
const activeConnectorExperiments = new Map<string, { dispatchUrl: string; remoteId: string; polling: boolean }>();

export async function startExperimentWithRuntime(
  experiment: Experiment,
  runtime: Runtime,
  onEvent: (event: ExperimentEvent) => void,
  gateway_token?: string
): Promise<void> {
  markRuntimeBusy(runtime, experiment.experiment_id);

  if (runtime.runtime_type === 'openclaw') {
    // For real runtimes, dispatch to the connector dispatch server (not directly to gateway)
    if (runtime.runtime_mode === 'real') {
      if (!runtime.gateway_url) {
        markRuntimeFree(runtime);
        throw new Error('Real runtime missing gateway_url (connector dispatch server URL)');
      }
      try {
        await dispatchToConnector(experiment, runtime.gateway_url, onEvent, gateway_token);
      } catch (err) {
        markRuntimeFree(runtime);
        onEvent({
          event_id: crypto.randomUUID(),
          experiment_id: experiment.experiment_id,
          timestamp: Date.now(),
          type: 'error',
          data: { message: (err as Error).message },
        });
        throw err;
      }
      return;
    }

    // For demo/simulated runtimes, use the OpenClawAdapter as before
    const config: OpenClawConfig = {
      mode: runtime.runtime_mode,
      gateway_url: runtime.endpoint,
      device_id: `runtime-${runtime.runtime_id}`,
      private_key: 'stub-key',
      gateway_token,
    };

    const adapter = new OpenClawAdapter(config);
    activeAdapters.set(experiment.experiment_id, adapter);
    adapter.onEvent(onEvent);

    try {
      await adapter.connect();
      await adapter.sendAgentRequest(experiment.task);
    } catch (err) {
      markRuntimeFree(runtime);
      onEvent({
        event_id: crypto.randomUUID(),
        experiment_id: experiment.experiment_id,
        timestamp: Date.now(),
        type: 'error',
        data: { message: (err as Error).message },
      });
      throw err;
    }
  } else {
    markRuntimeFree(runtime);
    throw new Error(`Runtime type ${runtime.runtime_type} not supported yet`);
  }
}

// POST experiment to connector dispatch server, then poll for events
async function dispatchToConnector(
  experiment: Experiment,
  dispatchUrl: string,
  onEvent: (event: ExperimentEvent) => void,
  gateway_token?: string
): Promise<void> {
  const emit = (type: string, data: any) =>
    onEvent({
      event_id: crypto.randomUUID(),
      experiment_id: experiment.experiment_id,
      timestamp: Date.now(),
      type,
      data,
    });

  emit('dispatching_to_connector', { dispatch_url: dispatchUrl });

  const res = await fetch(`${dispatchUrl}/experiments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      task: experiment.task,
      gateway_token,
      device_id: experiment.experiment_id,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Connector dispatch failed (HTTP ${res.status}): ${body}`);
  }

  const result = await res.json() as { experiment_id: string; status: string };
  const remoteId = result.experiment_id;

  emit('experiment_dispatched', { remote_experiment_id: remoteId });

  activeConnectorExperiments.set(experiment.experiment_id, {
    dispatchUrl,
    remoteId,
    polling: true,
  });

  // Poll for events
  await pollConnectorEvents(experiment.experiment_id, dispatchUrl, remoteId, emit);
}

async function pollConnectorEvents(
  localExperimentId: string,
  dispatchUrl: string,
  remoteId: string,
  emit: (type: string, data: any) => void
): Promise<void> {
  emit('awaiting_events', { remote_experiment_id: remoteId });

  const maxAttempts = 60; // 2 min at 2s intervals
  let attempts = 0;
  let seenEventCount = 0;

  while (attempts < maxAttempts) {
    const state = activeConnectorExperiments.get(localExperimentId);
    if (!state?.polling) break;

    try {
      const res = await fetch(`${dispatchUrl}/experiments/${remoteId}/events`);
      if (res.ok) {
        const events = await res.json() as Array<{ type: string; data: any; timestamp: number }>;

        // Emit only new events
        const newEvents = events.slice(seenEventCount);
        for (const evt of newEvents) {
          emit(evt.type, evt.data);
        }
        seenEventCount = events.length;

        const done = events.some(e =>
          e.type === 'experiment_completed' || e.type === 'experiment_failed' ||
          e.type === 'agent_execution_completed' || e.type === 'acp_incomplete'
        );
        if (done) {
          activeConnectorExperiments.delete(localExperimentId);
          return;
        }
      }
    } catch (err) {
      emit('polling_error', { error: (err as Error).message });
    }

    await new Promise(resolve => setTimeout(resolve, 2000));
    attempts++;
  }

  emit('experiment_timeout', { remote_experiment_id: remoteId });
  activeConnectorExperiments.delete(localExperimentId);
}

export async function stopExperimentAdapter(experiment_id: string, runtime?: Runtime): Promise<void> {
  // Stop connector polling if active
  const connectorState = activeConnectorExperiments.get(experiment_id);
  if (connectorState) {
    connectorState.polling = false;
    activeConnectorExperiments.delete(experiment_id);
  }

  const adapter = activeAdapters.get(experiment_id);
  if (adapter) {
    await adapter.disconnect();
    activeAdapters.delete(experiment_id);
  }
  if (runtime) {
    markRuntimeFree(runtime);
  }
}
