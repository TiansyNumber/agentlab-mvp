// Experiment Control API - Cloudflare Workers compatible
import type { Experiment, ExperimentEvent } from '../models/experiment';
import type { Runtime } from '../models/runtime';
import { startExperimentWithRuntime, stopExperimentAdapter } from '../services/experiment-manager';

// In-memory store (replace with D1/KV in production)
const experiments = new Map<string, Experiment>();
const events = new Map<string, ExperimentEvent[]>();

export async function startExperiment(
  runtime_id: string,
  owner: string,
  task: string,
  runtime: Runtime
): Promise<Experiment> {
  if (!task?.trim()) throw new Error('task required');

  const experiment: Experiment = {
    experiment_id: crypto.randomUUID(),
    runtime_id,
    owner,
    task,
    status: 'running',
    phase: 'created',
    created_at: Date.now(),
    started_at: Date.now(),
  };
  experiments.set(experiment.experiment_id, experiment);
  events.set(experiment.experiment_id, []);

  // Connect to runtime adapter
  const eventHandler = (event: ExperimentEvent) => {
    addExperimentEvent(experiment.experiment_id, event.type, event.data);

    // Update phase based on events
    if (event.type === 'connecting_gateway') experiment.phase = 'connecting';
    else if (event.type === 'gateway_connected' || event.type === 'connected') experiment.phase = 'connected';
    else if (event.type === 'authenticating') experiment.phase = 'authenticating';
    else if (event.type === 'authenticated') experiment.phase = 'authenticated';
    else if (event.type === 'task_submitted' || event.type === 'submitting_experiment') experiment.phase = 'command_sent';
    else if (event.type === 'agent_thinking' || event.type === 'agent_action') experiment.phase = 'execution_running';
    else if (event.type === 'experiment_completed') {
      experiment.phase = 'execution_completed';
      experiment.status = 'completed';
      experiment.completed_at = Date.now();
    } else if (event.type === 'experiment_failed') {
      experiment.phase = 'execution_failed';
      experiment.status = 'failed';
      experiment.failure_reason = 'unknown';
      experiment.completed_at = Date.now();
    } else if (event.type === 'experiment_timeout') {
      experiment.phase = 'execution_failed';
      experiment.status = 'failed';
      experiment.failure_reason = 'timeout';
      experiment.completed_at = Date.now();
    } else if (event.type === 'disconnected') {
      experiment.phase = 'disconnected';
      if (experiment.status === 'running') {
        experiment.status = 'failed';
        experiment.failure_reason = 'runtime_disconnected';
      }
    }
  };

  try {
    await startExperimentWithRuntime(experiment, runtime, eventHandler);
  } catch (err) {
    experiment.status = 'failed';
    const errorMsg = (err as Error).message;

    // Classify failure reason
    if (errorMsg.includes('connect') || errorMsg.includes('gateway')) {
      experiment.failure_reason = 'gateway_connect_failed';
      experiment.phase = 'connecting';
    } else if (errorMsg.includes('auth')) {
      experiment.failure_reason = 'auth_failed';
      experiment.phase = 'authenticating';
    } else {
      experiment.failure_reason = 'unknown';
    }

    addExperimentEvent(experiment.experiment_id, 'start_failed', {
      error: errorMsg,
      failure_reason: experiment.failure_reason,
    });
  }

  return experiment;
}

export async function stopExperiment(experiment_id: string): Promise<void> {
  const exp = experiments.get(experiment_id);
  if (!exp) throw new Error('Experiment not found');
  exp.status = 'stopped';
  exp.phase = 'disconnected';
  exp.completed_at = Date.now();
  await stopExperimentAdapter(experiment_id);
  await addExperimentEvent(experiment_id, 'experiment_stopped', { stopped_at: exp.completed_at });
}

export async function getExperiment(experiment_id: string): Promise<Experiment | null> {
  return experiments.get(experiment_id) || null;
}

export async function getExperimentEvents(experiment_id: string, since?: number): Promise<ExperimentEvent[]> {
  const allEvents = events.get(experiment_id) || [];
  if (since !== undefined) {
    return allEvents.filter(e => e.timestamp > since);
  }
  return allEvents;
}

export async function retryExperiment(experiment_id: string): Promise<Experiment> {
  const oldExp = experiments.get(experiment_id);
  if (!oldExp) throw new Error('Experiment not found');

  // Create new experiment with same task and runtime
  const newExp: Experiment = {
    experiment_id: crypto.randomUUID(),
    runtime_id: oldExp.runtime_id,
    owner: oldExp.owner,
    task: oldExp.task,
    status: 'running',
    phase: 'created',
    created_at: Date.now(),
    started_at: Date.now(),
  };
  experiments.set(newExp.experiment_id, newExp);
  events.set(newExp.experiment_id, []);

  addExperimentEvent(newExp.experiment_id, 'experiment_retried', {
    original_experiment_id: experiment_id,
  });

  return newExp;
}

export async function addExperimentEvent(experiment_id: string, type: string, data: any): Promise<void> {
  const eventList = events.get(experiment_id);
  if (!eventList) throw new Error('Experiment not found');
  eventList.push({
    event_id: crypto.randomUUID(),
    experiment_id,
    timestamp: Date.now(),
    type,
    data,
  });
}
