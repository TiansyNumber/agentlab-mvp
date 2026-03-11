import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';
import { createServer } from 'http';
import WebSocket from 'ws';
import crypto from 'crypto';

interface ConnectorConfig {
  backend: string;
  gateway: string;
  name: string;
  gatewayToken?: string;
  deviceId?: string;
  publicKey?: string;
  privateKeyPem?: string;
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
    const identityPath = join(homedir(), '.openclaw', 'identity', 'device.json');
    if (existsSync(identityPath)) {
      try {
        const identity = JSON.parse(readFileSync(identityPath, 'utf-8'));
        this.config.deviceId = identity.deviceId;
        this.config.publicKey = this.derivePublicKey(identity.publicKeyPem);
        this.config.privateKeyPem = identity.privateKeyPem;
        return;
      } catch {}
    }
    throw new Error('Device identity not found. Please ensure OpenClaw is installed.');
  }

  private derivePublicKey(publicKeyPem: string): string {
    const ED25519_SPKI_PREFIX = Buffer.from('302a300506032b6570032100', 'hex');
    const publicKey = crypto.createPublicKey(publicKeyPem);
    const der = publicKey.export({ type: 'spki', format: 'der' }) as Buffer;
    const raw = der.subarray(ED25519_SPKI_PREFIX.length);
    return raw.toString('base64url');
  }

  private buildAuthSignature(nonce: string, clientId: string, clientMode: string, role: string, scopes: string): string {
    const signedAt = Date.now();
    const payload = `v2|${this.config.deviceId}|${clientId}|${clientMode}|${role}|${scopes}|${signedAt}||${nonce}`;
    const privateKey = crypto.createPrivateKey(this.config.privateKeyPem!);
    const signature = crypto.sign(null, Buffer.from(payload, 'utf8'), privateKey).toString('base64url');
    return signature;
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
      owner: 'auto-paired',
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

  async requestPairing(): Promise<{ pairing_code: string; runtime_id: string }> {
    const payload = {
      runtime_type: 'openclaw',
      runtime_mode: 'real',
      display_name: this.config.name,
      device_id: this.config.deviceId,
    };

    const res = await fetch(`${this.config.backend}/api/pairing/request`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(10000)
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Pairing request failed (HTTP ${res.status}): ${body}`);
    }

    const result = await res.json();
    this.runtimeId = result.runtime_id;
    return result;
  }

  async completePairingWithGateway(gatewayUrl: string): Promise<Runtime> {
    if (!this.runtimeId) throw new Error('No runtime ID - call requestPairing first');

    const res = await fetch(`${this.config.backend}/api/pairing/complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        runtime_id: this.runtimeId,
        gateway_url: gatewayUrl,
      }),
      signal: AbortSignal.timeout(10000)
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Pairing completion failed (HTTP ${res.status}): ${body}`);
    }

    return await res.json();
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
              this.dispatchToOpenClaw(experimentId, payload.task, payload.gateway_token).catch(err => {
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
  private async dispatchToOpenClaw(experimentId: string, task: string, gatewayToken?: string): Promise<void> {
    const exp = this.experiments.get(experimentId);
    if (!exp) return;
    if (exp.dispatched) return;
    exp.dispatched = true;

    exp.events = [];
    const addEvent = (type: string, data: any) => {
      exp.events.push({ type, data, timestamp: Date.now() });
      console.log(`   [${experimentId.substring(0, 8)}] event: ${type}`);
    };

    const baseWsUrl = this.config.gateway.replace(/^http/, 'ws');
    const effectiveToken = gatewayToken || this.config.gatewayToken;
    const gatewayWsUrl = effectiveToken
      ? `${baseWsUrl}?token=${encodeURIComponent(effectiveToken)}`
      : baseWsUrl;
    addEvent('acp_connecting', { url: baseWsUrl });

    try {
      const ws = new WebSocket(gatewayWsUrl);
      let handshakeComplete = false;
      let promptSent = false;

      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          if (!handshakeComplete) {
            ws.close();
            reject(new Error('ACP handshake timeout'));
          }
        }, 10000);

        ws.on('open', () => {
          addEvent('acp_ws_open', { url: gatewayWsUrl });
        });

        ws.on('message', (data: Buffer) => {
          try {
            const msg = JSON.parse(data.toString());

            // Handle connect.challenge
            if (msg.type === 'event' && msg.event === 'connect.challenge') {
              addEvent('acp_challenge_received', { nonce: msg.payload.nonce });
              const nonce = msg.payload.nonce;
              const signedAt = Date.now();
              const clientId = 'node-host';
              const clientMode = 'backend';
              const role = 'operator';
              const scopes = 'operator.admin';

              const payload = `v2|${this.config.deviceId}|${clientId}|${clientMode}|${role}|${scopes}|${signedAt}||${nonce}`;
              const privateKey = crypto.createPrivateKey(this.config.privateKeyPem!);
              const signature = crypto.sign(null, Buffer.from(payload, 'utf8'), privateKey).toString('base64url');

              const connectReq = {
                type: 'req',
                id: 'connect-1',
                method: 'connect',
                params: {
                  minProtocol: 3,
                  maxProtocol: 3,
                  client: {
                    id: clientId,
                    version: '0.1.0',
                    platform: 'darwin',
                    mode: clientMode
                  },
                  device: {
                    id: this.config.deviceId,
                    publicKey: this.config.publicKey,
                    signature: signature,
                    signedAt: signedAt,
                    nonce: nonce
                  },
                  role: role,
                  scopes: [scopes]
                }
              };
              ws.send(JSON.stringify(connectReq));
              addEvent('acp_connect_sent', {});
            }
            // Handle connect response
            else if (msg.type === 'res' && msg.id === 'connect-1') {
              if (msg.ok) {
                clearTimeout(timeout);
                handshakeComplete = true;
                addEvent('acp_handshake_complete', {});

                // Send chat message
                const chatReq = {
                  type: 'req',
                  id: 'chat-1',
                  method: 'chat.send',
                  params: {
                    sessionKey: 'agent:main:main',
                    message: task,
                    idempotencyKey: crypto.randomUUID()
                  }
                };
                ws.send(JSON.stringify(chatReq));
                promptSent = true;
                addEvent('acp_chat_sent', { task: task.substring(0, 50) });
              } else {
                addEvent('acp_connect_failed', { error: msg.error });
                reject(new Error(`ACP connect failed: ${msg.error?.message}`));
              }
            }
            // Handle chat response
            else if (msg.type === 'res' && msg.id === 'chat-1') {
              addEvent('acp_chat_response', { ok: msg.ok });
              if (!msg.ok) {
                addEvent('acp_chat_failed', { error: msg.error });
              }
            }
            // Handle agent events
            else if (msg.type === 'event' && msg.event === 'agent') {
              const payload = msg.payload;
              if (payload.stream === 'lifecycle' && payload.data.phase === 'start') {
                addEvent('agent_execution_started', { runId: payload.runId, source: 'gateway_ws' });
              } else if (payload.stream === 'lifecycle' && payload.data.phase === 'end') {
                addEvent('agent_execution_completed', { runId: payload.runId, source: 'gateway_ws' });
                exp.status = 'completed';
                ws.close();
              } else if (payload.stream === 'assistant') {
                addEvent('agent_response', { text: payload.data.delta, source: 'gateway_ws' });
              }
            }
            // Handle other events
            else if (msg.type === 'event') {
              addEvent('acp_event', { event: msg.event });
            }
          } catch (err) {
            addEvent('acp_parse_error', { error: (err as Error).message });
          }
        });

        ws.on('error', (err) => {
          addEvent('acp_error', { error: err.message });
          if (!handshakeComplete) reject(err);
        });

        ws.on('close', () => {
          addEvent('acp_closed', {});
          if (exp.status !== 'completed') {
            addEvent('acp_incomplete', { handshakeComplete, promptSent });
            exp.status = 'completed';
          }
          resolve();
        });

        setTimeout(() => {
          if (exp.status !== 'completed') {
            addEvent('acp_timeout', {});
            exp.status = 'completed';
            ws.close();
            resolve();
          }
        }, 30000);
      });

      console.log(`✅ Experiment ${experimentId.substring(0, 8)} completed`);
    } catch (err) {
      addEvent('acp_failed', { error: (err as Error).message });
      addEvent('experiment_completed', { status: 'failed', error: (err as Error).message });
      exp.status = 'failed';
      console.error(`❌ ACP failed: ${(err as Error).message}`);
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
