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
    created_at: Date.now(),
    started_at: Date.now(),
  };
  experiments.set(experiment.experiment_id, experiment);
  events.set(experiment.experiment_id, []);

  // Connect to runtime adapter
  const eventHandler = (event: ExperimentEvent) => {
    addExperimentEvent(experiment.experiment_id, event.type, event.data);
    // Update experiment status based on events
    if (event.type === 'experiment_completed') {
      experiment.status = 'completed';
      experiment.completed_at = Date.now();
    } else if (event.type === 'experiment_failed' || event.type === 'experiment_timeout') {
      experiment.status = 'failed';
      experiment.completed_at = Date.now();
    }
  };

  try {
    await startExperimentWithRuntime(experiment, runtime, eventHandler);
  } catch (err) {
    experiment.status = 'failed';
    addExperimentEvent(experiment.experiment_id, 'start_failed', {
      error: (err as Error).message,
    });
  }

  return experiment;
}

export async function stopExperiment(experiment_id: string): Promise<void> {
  const exp = experiments.get(experiment_id);
  if (!exp) throw new Error('Experiment not found');
  exp.status = 'completed';
  exp.completed_at = Date.now();
  await stopExperimentAdapter(experiment_id);
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
