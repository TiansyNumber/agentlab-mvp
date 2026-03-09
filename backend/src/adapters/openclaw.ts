// OpenClaw Runtime Adapter
// This adapter runs in AgentLab Backend (NOT in Cloudflare)
// It handles device signature generation and Gateway communication

import type { ExperimentEvent } from '../models/experiment';
import type { RuntimeMode } from '../models/runtime';

export interface OpenClawConfig {
  mode: RuntimeMode;
  gateway_url?: string;
  device_id?: string;
  private_key?: string; // Real device private key (NOT exposed to browser)
}

export class OpenClawAdapter {
  private config: OpenClawConfig;
  private eventCallback: ((event: ExperimentEvent) => void) | null = null;
  private connected = false;
  private simulationTimer: any = null;

  constructor(config: OpenClawConfig) {
    this.config = config;
    if (config.mode === 'real' && (!config.gateway_url || !config.device_id)) {
      throw new Error('Real mode requires gateway_url and device_id');
    }
  }

  async connect(): Promise<void> {
    if (this.config.mode === 'real') {
      await this.connectRealGateway();
      return;
    }
    this.connected = true;
    const msg = this.config.mode === 'demo'
      ? 'Connected (demo mode)'
      : `Connected (simulated mode)`;
    this.emitEvent('connected', { message: msg, mode: this.config.mode });
  }

  private async connectRealGateway(): Promise<void> {
    this.emitEvent('runtime_selected', { mode: 'real', gateway_url: this.config.gateway_url });

    // Validate config
    this.emitEvent('validating_config', { device_id: this.config.device_id });
    if (!this.config.gateway_url || !this.config.device_id) {
      this.emitEvent('validation_failed', { error: 'Missing gateway_url or device_id' });
      throw new Error('Real mode requires gateway_url and device_id');
    }
    this.emitEvent('config_validated', { device_id: this.config.device_id });

    // Connect to gateway
    this.emitEvent('connecting_gateway', { gateway_url: this.config.gateway_url });
    try {
      const response = await fetch(`${this.config.gateway_url}/health`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        this.emitEvent('connection_failed', {
          status: response.status,
          error: `Gateway returned ${response.status}`
        });
        throw new Error(`Gateway health check failed: ${response.status}`);
      }

      this.emitEvent('gateway_connected', { gateway_url: this.config.gateway_url });
    } catch (err) {
      this.emitEvent('connection_failed', {
        error: (err as Error).message,
        gateway_url: this.config.gateway_url
      });
      throw new Error(`Failed to connect to gateway: ${(err as Error).message}`);
    }

    // Authenticate
    this.emitEvent('authenticating', { device_id: this.config.device_id });
    try {
      await this.authenticateDevice();
      this.emitEvent('authenticated', { device_id: this.config.device_id });
    } catch (err) {
      this.emitEvent('authentication_failed', { error: (err as Error).message });
      throw err;
    }

    this.connected = true;
    this.emitEvent('connected', {
      message: 'Connected to real OpenClaw Gateway',
      mode: 'real',
      gateway_url: this.config.gateway_url
    });
  }

  private async authenticateDevice(): Promise<void> {
    // Minimal device authentication
    const authPayload = {
      device_id: this.config.device_id,
      timestamp: Date.now(),
    };

    const response = await fetch(`${this.config.gateway_url}/auth/device`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(authPayload),
    });

    if (!response.ok) {
      throw new Error(`Device authentication failed: ${response.status}`);
    }
  }

  async sendAgentRequest(task: string): Promise<void> {
    if (!this.connected) throw new Error('Not connected');
    this.emitEvent('task_submitted', { task });

    if (this.config.mode === 'real') {
      await this.executeRealTask(task);
    } else {
      this.simulateExecution(task);
    }
  }

  private async executeRealTask(task: string): Promise<void> {
    this.emitEvent('submitting_experiment', { task });

    try {
      const response = await fetch(`${this.config.gateway_url}/experiments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          device_id: this.config.device_id,
          task,
          timestamp: Date.now(),
        }),
      });

      if (!response.ok) {
        this.emitEvent('submission_failed', { status: response.status });
        throw new Error(`Experiment submission failed: ${response.status}`);
      }

      const result = await response.json();
      this.emitEvent('experiment_submitted', { experiment_id: result.experiment_id });

      // Poll for results
      await this.pollExperimentResults(result.experiment_id);
    } catch (err) {
      this.emitEvent('experiment_failed', { error: (err as Error).message });
      throw err;
    }
  }

  private async pollExperimentResults(experimentId: string): Promise<void> {
    this.emitEvent('awaiting_events', { experiment_id: experimentId });

    let attempts = 0;
    const maxAttempts = 30;

    while (attempts < maxAttempts) {
      try {
        const response = await fetch(`${this.config.gateway_url}/experiments/${experimentId}/events`);

        if (response.ok) {
          const events = await response.json();
          for (const evt of events) {
            this.emitEvent(evt.type, evt.data);
          }

          // Check if completed
          const completed = events.some((e: any) => e.type === 'experiment_completed');
          if (completed) {
            return;
          }
        }
      } catch (err) {
        this.emitEvent('polling_error', { error: (err as Error).message });
      }

      await new Promise(resolve => setTimeout(resolve, 2000));
      attempts++;
    }

    this.emitEvent('experiment_timeout', { experiment_id: experimentId });
  }

  private simulateExecution(task: string): void {
    let step = 0;
    this.simulationTimer = setInterval(() => {
      step++;
      if (step === 1) {
        this.emitEvent('agent_thinking', { message: 'Analyzing task...' });
      } else if (step === 2) {
        this.emitEvent('agent_action', { message: 'Executing step 1: Reading files' });
      } else if (step === 3) {
        this.emitEvent('agent_action', { message: 'Executing step 2: Processing data' });
      } else if (step === 4) {
        this.emitEvent('agent_response', { message: `Task completed: ${task.substring(0, 50)}...` });
        this.emitEvent('experiment_completed', { status: 'success' });
        clearInterval(this.simulationTimer);
      }
    }, 2000);
  }

  async disconnect(): Promise<void> {
    this.connected = false;
    if (this.simulationTimer) clearInterval(this.simulationTimer);
    this.emitEvent('disconnected', { message: 'Disconnected from Gateway' });
  }

  onEvent(callback: (event: ExperimentEvent) => void): void {
    this.eventCallback = callback;
  }

  private emitEvent(type: string, data: any): void {
    if (this.eventCallback) {
      this.eventCallback({
        event_id: crypto.randomUUID(),
        experiment_id: '',
        timestamp: Date.now(),
        type,
        data,
      });
    }
  }
}
