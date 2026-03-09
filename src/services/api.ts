const API_BASE = 'https://agentlab-backend.supertiansy.workers.dev';

export interface Runtime {
  id: string;
  owner: string;
  type: string;
  capabilities: string[];
  status: string;
  last_heartbeat: string;
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

export const api = {
  async registerRuntime(data: { owner: string; type: string; capabilities: string[] }): Promise<Runtime> {
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

  async getExperimentEvents(id: string): Promise<ExperimentEvent[]> {
    const res = await fetch(`${API_BASE}/api/experiments/${id}/events`);
    if (!res.ok) throw new Error(`Failed to get events: ${res.statusText}`);
    return res.json();
  }
};
