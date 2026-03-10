// Experiment data model for AgentLab V2 platform layer

export type ExperimentStatus = 'pending' | 'running' | 'paused' | 'completed' | 'failed' | 'stopped';

export type ExperimentPhase =
  | 'created'
  | 'connecting'
  | 'connected'
  | 'authenticating'
  | 'authenticated'
  | 'command_sent'
  | 'action_received'
  | 'execution_running'
  | 'execution_completed'
  | 'execution_failed'
  | 'disconnected';

export type FailureReason =
  | 'gateway_connect_failed'
  | 'auth_failed'
  | 'command_rejected'
  | 'event_mapping_failed'
  | 'runtime_disconnected'
  | 'timeout'
  | 'unknown';

export interface Experiment {
  experiment_id: string;
  runtime_id: string;
  owner: string;
  task: string;
  status: ExperimentStatus;
  phase?: ExperimentPhase;
  failure_reason?: FailureReason;
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
