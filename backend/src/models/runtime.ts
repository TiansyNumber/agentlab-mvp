// Runtime data model for AgentLab V2 platform layer

export type RuntimeStatus = 'online' | 'offline' | 'degraded';
export type RuntimeType = 'openclaw' | 'anthropic' | 'mock';
export type AuthMode = 'token' | 'device_signature' | 'none';
export type RuntimeMode = 'demo' | 'simulated' | 'real';

export interface Runtime {
  runtime_id: string;
  runtime_type: RuntimeType;
  runtime_mode: RuntimeMode;
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
  // Real OpenClaw runtime fields (only for runtime_mode='real')
  device_id?: string;
  gateway_url?: string;
}

export interface RuntimeHeartbeat {
  runtime_id: string;
  status: RuntimeStatus;
  active_experiments: number;
  timestamp: number;
}

export interface RuntimeRegistration {
  runtime_type: RuntimeType;
  runtime_mode: RuntimeMode;
  display_name: string;
  endpoint: string;
  auth_mode: AuthMode;
  capabilities: string[];
  max_concurrency: number;
  owner: string;
  tenant?: string;
  // Real OpenClaw runtime fields (required when runtime_mode='real')
  device_id?: string;
  gateway_url?: string;
}
