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
  private ws: WebSocket | null = null;

  constructor(config: OpenClawConfig) {
    this.config = config;
  }

  async connect(): Promise<void> {
    // TODO: Implement real device signature generation
    // TODO: Implement Gateway WebSocket connection
    throw new Error('Not implemented - requires real device signature');
  }

  async sendAgentRequest(task: string): Promise<void> {
    // TODO: Send agent request to OpenClaw Gateway
    throw new Error('Not implemented');
  }

  async disconnect(): Promise<void> {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  onEvent(callback: (event: ExperimentEvent) => void): void {
    // TODO: Register event callback for Gateway events
  }
}
