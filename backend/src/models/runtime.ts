// Runtime data model for AgentLab V2 platform layer

export type RuntimeStatus = 'online' | 'offline' | 'degraded';
export type RuntimeType = 'openclaw' | 'anthropic' | 'mock';
export type AuthMode = 'token' | 'device_signature' | 'none';

export interface Runtime {
  runtime_id: string;
  runtime_type: RuntimeType;
  display_name: string;
  endpoint: string;
  auth_mode: AuthMode;
  capabilities: string[];
  status: RuntimeStatus;
  owner: string;
  tenant?: string;
  max_concurrency: number;
  last_heartbeat_at: number;
  created_at: number;
}

export interface RuntimeHeartbeat {
  runtime_id: string;
  status: RuntimeStatus;
  active_experiments: number;
  timestamp: number;
}

export interface RuntimeRegistration {
  runtime_type: RuntimeType;
  display_name: string;
  endpoint: string;
  auth_mode: AuthMode;
  capabilities: string[];
  max_concurrency: number;
  owner: string;
  tenant?: string;
}
