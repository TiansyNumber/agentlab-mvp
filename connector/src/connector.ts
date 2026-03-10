import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';
import { createServer } from 'http';
import WebSocket from 'ws';

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
  private httpServer?: ReturnType<typeof createServer>;
  private experiments = new Map<string, any>();

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

  // Register with dispatch server URL as gateway_url (so backend calls dispatch server for /experiments)
  async registerWithDispatch(dispatchUrl: string): Promise<Runtime> {
    const payload = {
      runtime_type: 'openclaw',
      runtime_mode: 'real',
      display_name: this.config.name,
      endpoint: dispatchUrl,
      auth_mode: 'device_signature',
      capabilities: [],
      max_concurrency: 1,
      owner: 'local-user',
      device_id: this.config.deviceId,
      gateway_url: dispatchUrl,  // ← backend will POST /experiments to this URL
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

  // Start local HTTP server to receive experiment dispatch from AgentLab backend
  startDispatchServer(port = 18890): Promise<void> {
    return new Promise((resolve, reject) => {
      this.httpServer = createServer((req, res) => {
        const url = req.url || '';
        const method = req.method || '';

        // CORS headers
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Content-Type', 'application/json');

        if (method === 'OPTIONS') {
          res.writeHead(204);
          res.end();
          return;
        }

        // POST /experiments - receive experiment from AgentLab
        if (method === 'POST' && url === '/experiments') {
          let body = '';
          req.on('data', chunk => { body += chunk; });
          req.on('end', () => {
            try {
              const payload = JSON.parse(body);
              const experimentId = crypto.randomUUID();
              const experiment = {
                experiment_id: experimentId,
                task: payload.task,
                device_id: payload.device_id,
                status: 'running',
                created_at: Date.now(),
                dispatched: false,  // Track if already dispatched
              };
              this.experiments.set(experimentId, experiment);

              console.log(`\n📥 Experiment received: ${experimentId}`);
              console.log(`   Task: ${payload.task?.substring(0, 80)}`);

              // Dispatch to OpenClaw gateway async (only once)
              this.dispatchToOpenClaw(experimentId, payload.task).catch(err => {
                console.error(`❌ Dispatch error: ${err.message}`);
              });

              res.writeHead(200);
              res.end(JSON.stringify({ experiment_id: experimentId, status: 'accepted' }));
            } catch (err) {
              res.writeHead(400);
              res.end(JSON.stringify({ error: 'Invalid JSON' }));
            }
          });
          return;
        }

        // GET /experiments/:id/events - poll experiment events
        const eventsMatch = url.match(/^\/experiments\/([^/]+)\/events$/);
        if (method === 'GET' && eventsMatch) {
          const experimentId = eventsMatch[1];
          const exp = this.experiments.get(experimentId);
          if (!exp) {
            res.writeHead(404);
            res.end(JSON.stringify({ error: 'Experiment not found' }));
            return;
          }
          res.writeHead(200);
          res.end(JSON.stringify(exp.events || []));
          return;
        }

        // GET /health
        if (method === 'GET' && url === '/health') {
          res.writeHead(200);
          res.end(JSON.stringify({ ok: true, status: 'live', runtime_id: this.runtimeId }));
          return;
        }

        res.writeHead(404);
        res.end(JSON.stringify({ error: 'Not Found' }));
      });

      this.httpServer.on('error', reject);
      this.httpServer.listen(port, '127.0.0.1', () => {
        console.log(`✅ Dispatch server listening on http://127.0.0.1:${port}`);
        resolve();
      });
    });
  }

  // Dispatch experiment task to OpenClaw gateway via WebSocket
  private async dispatchToOpenClaw(experimentId: string, task: string): Promise<void> {
    const exp = this.experiments.get(experimentId);
    if (!exp) return;
    if (exp.dispatched) return;
    exp.dispatched = true;

    exp.events = [];
    const addEvent = (type: string, data: any) => {
      exp.events.push({ type, data, timestamp: Date.now() });
      console.log(`   [${experimentId.substring(0, 8)}] event: ${type}`);
    };

    const gatewayWsUrl = this.config.gateway.replace(/^http/, 'ws');
    addEvent('gateway_ws_connecting', { url: gatewayWsUrl });

    try {
      const ws = new WebSocket(gatewayWsUrl);
      let connected = false;

      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          if (!connected) {
            ws.close();
            reject(new Error('WebSocket connection timeout'));
          }
        }, 10000);

        ws.on('open', () => {
          connected = true;
          clearTimeout(timeout);
          addEvent('gateway_ws_connected', { url: gatewayWsUrl });

          // Send agent request via ACP protocol
          ws.send(JSON.stringify({
            type: 'agent_request',
            experiment_id: experimentId,
            message: task,
            timestamp: Date.now()
          }));
          addEvent('gateway_ws_message_sent', { task: task.substring(0, 50) });
        });

        ws.on('message', (data: Buffer) => {
          try {
            const msg = JSON.parse(data.toString());
            addEvent('gateway_ws_message_received', { type: msg.type });

            if (msg.type === 'agent_response') {
              addEvent('agent_response', { message: msg.content || msg.message, source: 'gateway_ws' });
            } else if (msg.type === 'agent_thinking') {
              addEvent('agent_thinking', { message: msg.message, source: 'gateway_ws' });
            } else if (msg.type === 'completed' || msg.type === 'done') {
              addEvent('experiment_completed', { status: 'success', source: 'gateway_ws' });
              exp.status = 'completed';
              ws.close();
              resolve();
            }
          } catch (err) {
            addEvent('gateway_ws_parse_error', { error: (err as Error).message });
          }
        });

        ws.on('error', (err) => {
          addEvent('gateway_ws_error', { error: err.message });
          if (!connected) reject(err);
        });

        ws.on('close', () => {
          addEvent('gateway_ws_closed', {});
          if (exp.status !== 'completed') {
            addEvent('gateway_ws_no_completion', { note: 'WebSocket closed before completion' });
            exp.status = 'completed';
          }
          resolve();
        });

        // Auto-complete after 30s if no completion message
        setTimeout(() => {
          if (exp.status !== 'completed') {
            addEvent('gateway_ws_timeout', { note: 'No completion after 30s' });
            exp.status = 'completed';
            ws.close();
            resolve();
          }
        }, 30000);
      });

      console.log(`✅ Experiment ${experimentId.substring(0, 8)} completed via Gateway WebSocket`);
    } catch (err) {
      addEvent('gateway_ws_failed', { error: (err as Error).message });
      addEvent('experiment_completed', { status: 'failed', source: 'gateway_ws', error: (err as Error).message });
      exp.status = 'failed';
      console.error(`❌ Gateway WebSocket failed: ${(err as Error).message}`);
    }
  }

  stop() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }
    if (this.httpServer) {
      this.httpServer.close();
    }
  }
}
