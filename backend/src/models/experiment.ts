// Experiment data model for AgentLab V2 platform layer

export type ExperimentStatus = 'pending' | 'running' | 'paused' | 'completed' | 'failed';

export interface Experiment {
  experiment_id: string;
  runtime_id: string;
  owner: string;
  task: string;
  status: ExperimentStatus;
  created_at: number;
  started_at?: number;
  completed_at?: number;
}

export interface ExperimentEvent {
  event_id: string;
  experiment_id: string;
  timestamp: number;
  type: string;
  data: any;
}
