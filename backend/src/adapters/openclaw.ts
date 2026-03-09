// OpenClaw Runtime Adapter
// This adapter runs in AgentLab Backend (NOT in Cloudflare)
// It handles device signature generation and Gateway communication

import type { ExperimentEvent } from '../models/experiment';

export interface OpenClawConfig {
  gateway_url: string;
  device_id: string;
  private_key: string; // Real device private key (NOT exposed to browser)
}

export class OpenClawAdapter {
  private config: OpenClawConfig;
  private eventCallback: ((event: ExperimentEvent) => void) | null = null;
  private connected = false;

  constructor(config: OpenClawConfig) {
    this.config = config;
  }

  async connect(): Promise<void> {
    this.connected = true;
    this.emitEvent('connected', { gateway_url: this.config.gateway_url });
  }

  async sendAgentRequest(task: string): Promise<void> {
    if (!this.connected) throw new Error('Not connected');
    this.emitEvent('task_submitted', { task });
  }

  async disconnect(): Promise<void> {
    this.connected = false;
    this.emitEvent('disconnected', {});
  }

  onEvent(callback: (event: ExperimentEvent) => void): void {
    this.eventCallback = callback;
  }

  private emitEvent(type: string, data: any): void {
    if (this.eventCallback) {
      this.eventCallback({
        event_id: crypto.randomUUID(),
        experiment_id: '', // Will be set by caller
        timestamp: Date.now(),
        type,
        data,
      });
    }
  }
}
