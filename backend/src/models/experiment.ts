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

export interface ExecutionStep {
  step_id: string;
  phase: ExperimentPhase;
  started_at: number;
  completed_at?: number;
  status: 'running' | 'completed' | 'failed';
  error?: string;
}

export interface ExecutionSummary {
  total_actions: number;
  key_actions: string[];
  final_output?: string;
  failure_step?: string;
}

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
  execution_steps?: ExecutionStep[];
  execution_summary?: ExecutionSummary;
}

export interface ExperimentEvent {
  event_id: string;
  experiment_id: string;
  timestamp: number;
  type: string;
  data: any;
}
