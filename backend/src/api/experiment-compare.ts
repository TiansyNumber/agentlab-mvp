// Compare Runs API - minimal viable implementation
import type { Experiment } from '../models/experiment';
import { getExperiment, getExperimentEvents } from './experiment-control';

export interface ExperimentCompareRow {
  id: string;
  runtime_id: string;
  task: string;
  status: string;
  phase?: string;
  failure_reason?: string;
  duration_ms?: number;
  event_count: number;
  final_result?: string; // last event data summary
  created_at: number;
  started_at?: number;
  completed_at?: number;
}

export interface ExperimentComparison {
  experiments: ExperimentCompareRow[];
  comparison: {
    all_same_task: boolean;
    all_same_runtime: boolean;
    success_count: number;
    failure_count: number;
    stopped_count: number;
    avg_duration_ms?: number;
    min_duration_ms?: number;
    max_duration_ms?: number;
    fastest_id?: string;
    slowest_id?: string;
    failure_stages: Record<string, number>; // failure_reason -> count
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

  const mapped: ExperimentCompareRow[] = await Promise.all(experiments.map(async e => {
    const evts = await getExperimentEvents(e.experiment_id);
    const lastEvt = evts[evts.length - 1];
    const final_result = lastEvt
      ? `[${lastEvt.type}] ${typeof lastEvt.data === 'string' ? lastEvt.data : JSON.stringify(lastEvt.data)}`
      : undefined;
    return {
      id: e.experiment_id,
      runtime_id: e.runtime_id,
      task: e.task,
      status: e.status,
      phase: e.phase,
      failure_reason: e.failure_reason,
      duration_ms: e.completed_at && e.started_at ? e.completed_at - e.started_at : undefined,
      event_count: evts.length,
      final_result,
      created_at: e.created_at,
      started_at: e.started_at,
      completed_at: e.completed_at,
    };
  }));

  const tasks = new Set(experiments.map(e => e.task));
  const runtimes = new Set(experiments.map(e => e.runtime_id));
  const success_count = experiments.filter(e => e.status === 'completed').length;
  const failure_count = experiments.filter(e => e.status === 'failed').length;
  const stopped_count = experiments.filter(e => e.status === 'stopped').length;

  const durations = mapped.filter(e => e.duration_ms !== undefined).map(e => ({ id: e.id, ms: e.duration_ms! }));
  const avg_duration_ms = durations.length > 0
    ? durations.reduce((a, b) => a + b.ms, 0) / durations.length
    : undefined;
  const min_duration_ms = durations.length > 0 ? Math.min(...durations.map(d => d.ms)) : undefined;
  const max_duration_ms = durations.length > 0 ? Math.max(...durations.map(d => d.ms)) : undefined;
  const fastest_id = durations.length > 0 ? durations.reduce((a, b) => a.ms < b.ms ? a : b).id : undefined;
  const slowest_id = durations.length > 0 ? durations.reduce((a, b) => a.ms > b.ms ? a : b).id : undefined;

  const failure_stages: Record<string, number> = {};
  for (const e of experiments) {
    if (e.failure_reason) {
      failure_stages[e.failure_reason] = (failure_stages[e.failure_reason] || 0) + 1;
    }
  }

  return {
    experiments: mapped,
    comparison: {
      all_same_task: tasks.size === 1,
      all_same_runtime: runtimes.size === 1,
      success_count,
      failure_count,
      stopped_count,
      avg_duration_ms,
      min_duration_ms,
      max_duration_ms,
      fastest_id,
      slowest_id,
      failure_stages,
    },
  };
}
