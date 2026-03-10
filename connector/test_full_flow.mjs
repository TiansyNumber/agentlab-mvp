import WebSocket from 'ws';
import crypto from 'crypto';
import { readFileSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';

const identityPath = join(homedir(), '.openclaw', 'identity', 'device.json');
const identity = JSON.parse(readFileSync(identityPath, 'utf8'));

// Extract raw public key (last 32 bytes of DER)
const publicKeyPem = identity.publicKeyPem;
const publicKeyDer = Buffer.from(publicKeyPem.split('\n').filter(l => !l.includes('BEGIN') && !l.includes('END')).join(''), 'base64');
const publicKeyRaw = publicKeyDer.slice(-32);
const publicKey = publicKeyRaw.toString('base64url');

const ws = new WebSocket('ws://localhost:18889');
let runId = null;
let responseText = '';

ws.on('open', () => console.log('✅ Connected'));

ws.on('message', (data) => {
  const msg = JSON.parse(data.toString());

  if (msg.type === 'event' && msg.event === 'connect.challenge') {
    const nonce = msg.payload.nonce;
    const signedAt = Date.now();
    const payload = `v2|${identity.deviceId}|node-host|backend|operator|operator.admin|${signedAt}||${nonce}`;
    const privateKey = crypto.createPrivateKey(identity.privateKeyPem);
    const signature = crypto.sign(null, Buffer.from(payload, 'utf8'), privateKey).toString('base64url');

    ws.send(JSON.stringify({
      type: 'req',
      id: 'connect-1',
      method: 'connect',
      params: {
        minProtocol: 3,
        maxProtocol: 3,
        client: { id: 'node-host', version: '0.1.0', platform: 'darwin', mode: 'backend' },
        device: { id: identity.deviceId, publicKey, signature, signedAt, nonce },
        role: 'operator',
        scopes: ['operator.admin']
      }
    }));
    console.log('📤 Auth sent');
  }
  else if (msg.type === 'res' && msg.id === 'connect-1') {
    if (msg.ok) {
      console.log('✅ Auth success');
      ws.send(JSON.stringify({
        type: 'req',
        id: 'chat-1',
        method: 'chat.send',
        params: {
          sessionKey: 'agent:main:main',
          message: 'list files in current directory',
          idempotencyKey: crypto.randomUUID()
        }
      }));
      console.log('📤 Command sent: list files');
    } else {
      console.log('❌ Auth failed:', msg.error);
      ws.close();
    }
  }
  else if (msg.type === 'res' && msg.id === 'chat-1') {
    console.log(msg.ok ? '✅ Command accepted' : '❌ Command failed:', msg.error);
  }
  else if (msg.type === 'event' && msg.event === 'agent') {
    const p = msg.payload;
    if (p.stream === 'lifecycle' && p.data.phase === 'start') {
      runId = p.runId;
      console.log(`🚀 Execution started: ${runId.substring(0, 8)}`);
    } else if (p.stream === 'lifecycle' && p.data.phase === 'end') {
      console.log(`✅ Execution completed: ${runId.substring(0, 8)}`);
      console.log(`\n📝 Full response:\n${responseText}\n`);
      ws.close();
    } else if (p.stream === 'assistant' && p.data.delta) {
      responseText += p.data.delta;
      process.stdout.write(p.data.delta);
    }
  }
});

ws.on('close', () => {
  console.log('\n🔌 Closed');
  process.exit(0);
});

ws.on('error', (err) => console.log('❌', err.message));

setTimeout(() => {
  console.log('\n⏱️  Timeout');
  ws.close();
}, 30000);
