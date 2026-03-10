// Compare Runs API - minimal viable implementation
import type { Experiment } from '../models/experiment';
import { getExperiment } from './experiment-control';

export interface ExperimentComparison {
  experiments: Array<{
    id: string;
    runtime_id: string;
    task: string;
    status: string;
    phase?: string;
    failure_reason?: string;
    duration_ms?: number;
    created_at: number;
    completed_at?: number;
  }>;
  comparison: {
    all_same_task: boolean;
    all_same_runtime: boolean;
    success_count: number;
    failure_count: number;
    avg_duration_ms?: number;
  };
}

export async function compareExperiments(experiment_ids: string[]): Promise<ExperimentComparison> {
  if (!experiment_ids || experiment_ids.length < 2) {
    throw new Error('At least 2 experiment IDs required');
  }

  const experiments: Experiment[] = [];
  for (const id of experiment_ids) {
    const exp = await getExperiment(id);
    if (!exp) throw new Error(`Experiment ${id} not found`);
    experiments.push(exp);
  }

  const mapped = experiments.map(e => ({
    id: e.experiment_id,
    runtime_id: e.runtime_id,
    task: e.task,
    status: e.status,
    phase: e.phase,
    failure_reason: e.failure_reason,
    duration_ms: e.completed_at && e.started_at ? e.completed_at - e.started_at : undefined,
    created_at: e.created_at,
    completed_at: e.completed_at,
  }));

  const tasks = new Set(experiments.map(e => e.task));
  const runtimes = new Set(experiments.map(e => e.runtime_id));
  const success_count = experiments.filter(e => e.status === 'completed').length;
  const failure_count = experiments.filter(e => e.status === 'failed').length;

  const durations = mapped.filter(e => e.duration_ms !== undefined).map(e => e.duration_ms!);
  const avg_duration_ms = durations.length > 0
    ? durations.reduce((a, b) => a + b, 0) / durations.length
    : undefined;

  return {
    experiments: mapped,
    comparison: {
      all_same_task: tasks.size === 1,
      all_same_runtime: runtimes.size === 1,
      success_count,
      failure_count,
      avg_duration_ms,
    },
  };
}
