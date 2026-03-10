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
  private heartbeatFailures = 0;

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
      try {
        const saved = JSON.parse(readFileSync(CONFIG_FILE, 'utf-8'));
        if (saved.deviceId) {
          this.config.deviceId = saved.deviceId;
          return;
        }
      } catch {
        // corrupted config, regenerate
      }
    }
    this.config.deviceId = crypto.randomUUID();
    this.saveConfig();
  }

  private saveConfig() {
    writeFileSync(CONFIG_FILE, JSON.stringify({ deviceId: this.config.deviceId }, null, 2));
  }

  // Check backend reachability before registering
  async checkBackend(): Promise<void> {
    try {
      const res = await fetch(`${this.config.backend}/health`, { signal: AbortSignal.timeout(5000) });
      if (!res.ok) throw new Error(`Backend returned ${res.status}`);
    } catch (err) {
      const msg = (err as Error).message;
      if (msg.includes('fetch failed') || msg.includes('ECONNREFUSED') || msg.includes('ENOTFOUND')) {
        throw new Error(`Backend not reachable at ${this.config.backend}\n  → Is the backend running? Try: cd backend && npx wrangler dev`);
      }
      throw new Error(`Backend health check failed: ${msg}\n  → URL: ${this.config.backend}`);
    }
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

    let res: Response;
    try {
      res = await fetch(`${this.config.backend}/api/runtimes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(10000)
      });
    } catch (err) {
      const msg = (err as Error).message;
      throw new Error(`Registration request failed: ${msg}\n  → Backend: ${this.config.backend}\n  → Is the backend running?`);
    }

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Registration failed (HTTP ${res.status}): ${body}\n  → Backend: ${this.config.backend}`);
    }

    const runtime = await res.json();
    this.runtimeId = runtime.runtime_id;
    return runtime;
  }

  async sendHeartbeat() {
    if (!this.runtimeId) return;

    try {
      const res = await fetch(`${this.config.backend}/api/runtimes/heartbeat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          runtime_id: this.runtimeId,
          status: 'online',
          active_experiments: 0,
          timestamp: Date.now()
        }),
        signal: AbortSignal.timeout(8000)
      });

      if (!res.ok) {
        this.heartbeatFailures++;
        console.warn(`⚠️  Heartbeat failed (HTTP ${res.status}), failures: ${this.heartbeatFailures}`);
      } else {
        if (this.heartbeatFailures > 0) {
          console.log(`✅ Heartbeat recovered after ${this.heartbeatFailures} failures`);
          this.heartbeatFailures = 0;
        }
      }
    } catch (err) {
      this.heartbeatFailures++;
      const msg = (err as Error).message;
      if (this.heartbeatFailures === 1) {
        console.warn(`⚠️  Heartbeat error: ${msg}`);
      } else if (this.heartbeatFailures % 5 === 0) {
        console.warn(`⚠️  Heartbeat still failing (${this.heartbeatFailures}x): ${msg}`);
        console.warn(`   → Backend: ${this.config.backend}`);
      }
    }
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
