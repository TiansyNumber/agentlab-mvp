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
      // TODO: Real Gateway connection with device signature
      throw new Error('Real OpenClaw Gateway connection not yet implemented');
    }
    this.connected = true;
    const msg = this.config.mode === 'demo'
      ? 'Connected (demo mode)'
      : `Connected (simulated mode)`;
    this.emitEvent('connected', { message: msg, mode: this.config.mode });
  }

  async sendAgentRequest(task: string): Promise<void> {
    if (!this.connected) throw new Error('Not connected');
    this.emitEvent('task_submitted', { task });

    // Simulate agent execution with events
    this.simulateExecution(task);
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
