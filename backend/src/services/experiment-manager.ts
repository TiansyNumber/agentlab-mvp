// Experiment Manager - connects experiments to runtime adapters
import type { Experiment, ExperimentEvent } from '../models/experiment';
import type { Runtime } from '../models/runtime';
import { OpenClawAdapter, type OpenClawConfig } from '../adapters/openclaw';

const activeAdapters = new Map<string, OpenClawAdapter>();

export async function startExperimentWithRuntime(
  experiment: Experiment,
  runtime: Runtime,
  onEvent: (event: ExperimentEvent) => void
): Promise<void> {
  if (runtime.runtime_type === 'openclaw') {
    const config: OpenClawConfig = {
      mode: runtime.runtime_mode,
      gateway_url: runtime.runtime_mode === 'real' ? runtime.gateway_url : runtime.endpoint,
      device_id: runtime.runtime_mode === 'real' ? runtime.device_id : `runtime-${runtime.runtime_id}`,
      private_key: 'stub-key', // TODO: retrieve from secure storage
    };

    const adapter = new OpenClawAdapter(config);
    activeAdapters.set(experiment.experiment_id, adapter);

    adapter.onEvent(onEvent);

    try {
      await adapter.connect();
      // Start task in background, don't await
      adapter.sendAgentRequest(experiment.task).catch(err => {
        onEvent({
          event_id: crypto.randomUUID(),
          experiment_id: experiment.experiment_id,
          timestamp: Date.now(),
          type: 'error',
          data: { message: (err as Error).message },
        });
      });
    } catch (err) {
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
    throw new Error(`Runtime type ${runtime.runtime_type} not supported yet`);
  }
}

export async function stopExperimentAdapter(experiment_id: string): Promise<void> {
  const adapter = activeAdapters.get(experiment_id);
  if (adapter) {
    await adapter.disconnect();
    activeAdapters.delete(experiment_id);
  }
}
