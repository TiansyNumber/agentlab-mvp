import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';

interface ConnectorConfig {
  backend: string;
  gateway: string;
  name: string;
  deviceId?: string;
}

interface Runtime {
  runtime_id: string;
  status: string;
  device_id?: string;
  gateway_url?: string;
}

const CONFIG_DIR = join(homedir(), '.agentlab');
const CONFIG_FILE = join(CONFIG_DIR, 'connector.json');

export class AgentLabConnector {
  private config: ConnectorConfig;
  private runtimeId?: string;
  private heartbeatInterval?: NodeJS.Timeout;

  constructor(config: ConnectorConfig) {
    this.config = config;
    this.ensureConfigDir();
    this.loadDeviceId();
  }

  private ensureConfigDir() {
    if (!existsSync(CONFIG_DIR)) {
      mkdirSync(CONFIG_DIR, { recursive: true });
    }
  }

  private loadDeviceId() {
    if (existsSync(CONFIG_FILE)) {
      const saved = JSON.parse(readFileSync(CONFIG_FILE, 'utf-8'));
      this.config.deviceId = saved.deviceId;
    } else {
      this.config.deviceId = crypto.randomUUID();
      this.saveConfig();
    }
  }

  private saveConfig() {
    writeFileSync(CONFIG_FILE, JSON.stringify({ deviceId: this.config.deviceId }, null, 2));
  }

  async register(): Promise<Runtime> {
    const payload = {
      runtime_type: 'openclaw',
      runtime_mode: 'real',
      display_name: this.config.name,
      endpoint: this.config.gateway,
      auth_mode: 'device_signature',
      capabilities: [],
      max_concurrency: 1,
      owner: 'local-user',
      device_id: this.config.deviceId,
      gateway_url: this.config.gateway
    };

    const res = await fetch(`${this.config.backend}/api/runtimes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!res.ok) throw new Error(`Registration failed: ${await res.text()}`);
    const runtime = await res.json();
    this.runtimeId = runtime.runtime_id;
    return runtime;
  }

  async sendHeartbeat() {
    if (!this.runtimeId) return;

    await fetch(`${this.config.backend}/api/runtimes/heartbeat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        runtime_id: this.runtimeId,
        status: 'online',
        active_experiments: 0,
        timestamp: Date.now()
      })
    });
  }

  startHeartbeat(intervalMs = 30000) {
    this.heartbeatInterval = setInterval(() => this.sendHeartbeat(), intervalMs);
  }

  stop() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }
  }
}
