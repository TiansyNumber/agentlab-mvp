const API_BASE = '';

export interface Runtime {
  id: string;
  owner: string;
  type: string;
  mode: 'demo' | 'simulated' | 'real';
  capabilities: string[];
  status: string;
  last_heartbeat: string;
  last_seen_ms_ago: number;
  is_stale: boolean;
  is_offline: boolean;
  is_busy: boolean;
  active_experiment_id?: string;
  active_experiment_duration_ms?: number;
  device_id?: string;
  gateway_url?: string;
}

export interface ExperimentStartRequest {
  runtime_id: string;
  owner: string;
  task: string;
}

export interface ExperimentResponse {
  id: string;
  runtime_id: string;
  owner: string;
  task: string;
  status: string;
  created_at: string;
}

export interface ExperimentEvent {
  id: string;
  experiment_id: string;
  type: string;
  message: string;
  timestamp: string;
}

export interface CompareResult {
  experiments: Array<{
    id: string;
    runtime_id: string;
    task: string;
    status: string;
    phase?: string;
    failure_reason?: string;
    duration_ms?: number;
    event_count: number;
    final_result?: string;
  }>;
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
    failure_stages: Record<string, number>;
  };
}

export const api = {
  async registerRuntime(data: { owner: string; type: string; runtime_mode: string; capabilities: string[]; device_id?: string; gateway_url?: string }): Promise<Runtime> {
    const res = await fetch(`${API_BASE}/api/runtimes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error(`Failed to register runtime: ${res.statusText}`);
    return res.json();
  },

  async listRuntimes(owner?: string): Promise<Runtime[]> {
    const url = owner ? `${API_BASE}/api/runtimes?owner=${owner}` : `${API_BASE}/api/runtimes`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Failed to list runtimes: ${res.statusText}`);
    return res.json();
  },

  async startExperiment(data: ExperimentStartRequest): Promise<ExperimentResponse> {
    const res = await fetch(`${API_BASE}/api/experiments/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error(`Failed to start experiment: ${res.statusText}`);
    return res.json();
  },

  async stopExperiment(id: string): Promise<void> {
    const res = await fetch(`${API_BASE}/api/experiments/${id}/stop`, { method: 'POST' });
    if (!res.ok) throw new Error(`Failed to stop experiment: ${res.statusText}`);
  },

  async retryExperiment(id: string): Promise<ExperimentResponse> {
    const res = await fetch(`${API_BASE}/api/experiments/${id}/retry`, { method: 'POST' });
    if (!res.ok) throw new Error(`Failed to retry experiment: ${res.statusText}`);
    return res.json();
  },

  async getExperimentEvents(id: string): Promise<ExperimentEvent[]> {
    const res = await fetch(`${API_BASE}/api/experiments/${id}/events`);
    if (!res.ok) throw new Error(`Failed to get events: ${res.statusText}`);
    return res.json();
  },

  async listExperiments(owner?: string, runtime_id?: string): Promise<ExperimentResponse[]> {
    const params = new URLSearchParams();
    if (owner) params.set('owner', owner);
    if (runtime_id) params.set('runtime_id', runtime_id);
    const res = await fetch(`${API_BASE}/api/experiments?${params}`);
    if (!res.ok) throw new Error(`Failed to list experiments: ${res.statusText}`);
    return res.json();
  },

  async compareExperiments(experiment_ids: string[]): Promise<CompareResult> {
    const res = await fetch(`${API_BASE}/api/experiments/compare`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ experiment_ids })
    });
    if (!res.ok) throw new Error(`Failed to compare experiments: ${res.statusText}`);
    return res.json();
  },

  async getRuntime(id: string): Promise<Runtime> {
    const res = await fetch(`${API_BASE}/api/runtimes/${id}`);
    if (!res.ok) throw new Error(`Failed to get runtime: ${res.statusText}`);
    return res.json();
  },

  async disconnectRuntime(id: string): Promise<void> {
    const res = await fetch(`${API_BASE}/api/runtimes/${id}/disconnect`, { method: 'POST' });
    if (!res.ok) throw new Error(`Failed to disconnect runtime: ${res.statusText}`);
  },

  async getPairingStatus(code: string): Promise<{ valid: boolean; expires_in_ms?: number }> {
    const res = await fetch(`${API_BASE}/api/connector/pair/${code}/status`);
    if (!res.ok) throw new Error(`Failed to get pairing status: ${res.statusText}`);
    return res.json();
  }
};
