// Experiment Control API - Cloudflare Workers compatible
import type { Experiment, ExperimentEvent } from '../models/experiment';

// In-memory store (replace with D1/KV in production)
const experiments = new Map<string, Experiment>();
const events = new Map<string, ExperimentEvent[]>();

export async function startExperiment(runtime_id: string, owner: string, task: string): Promise<Experiment> {
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
  return experiment;
}

export async function stopExperiment(experiment_id: string): Promise<void> {
  const exp = experiments.get(experiment_id);
  if (!exp) throw new Error('Experiment not found');
  exp.status = 'completed';
  exp.completed_at = Date.now();
}

export async function getExperiment(experiment_id: string): Promise<Experiment | null> {
  return experiments.get(experiment_id) || null;
}

export async function getExperimentEvents(experiment_id: string): Promise<ExperimentEvent[]> {
  return events.get(experiment_id) || [];
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
