import WebSocket from 'ws';
import crypto from 'crypto';
import { readFileSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';

const identityPath = join(homedir(), '.openclaw', 'identity', 'device.json');
const identity = JSON.parse(readFileSync(identityPath, 'utf8'));

const ws = new WebSocket('ws://localhost:18889');

ws.on('open', () => {
  console.log('✅ WebSocket open');
});

ws.on('message', (data) => {
  const msg = JSON.parse(data.toString());
  console.log(`📥 ${msg.type}:${msg.event || msg.id || ''}`);

  if (msg.type === 'event' && msg.event === 'connect.challenge') {
    const nonce = msg.payload.nonce;
    const signedAt = Date.now();
    const deviceId = identity.deviceId;

    // Extract raw public key from PEM (remove header/footer, decode base64, skip SPKI prefix, encode as base64url)
    const publicKeyPem = identity.publicKeyPem;
    const publicKeyDer = Buffer.from(publicKeyPem.split('\n').filter(l => !l.includes('BEGIN') && !l.includes('END')).join(''), 'base64');
    const publicKeyRaw = publicKeyDer.slice(-32); // Last 32 bytes for ed25519
    const publicKey = publicKeyRaw.toString('base64url');

    const payload = `v2|${deviceId}|node-host|backend|operator|operator.admin|${signedAt}||${nonce}`;
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
        device: { id: deviceId, publicKey, signature, signedAt, nonce },
        role: 'operator',
        scopes: ['operator.admin']
      }
    }));
    console.log('📤 connect sent');
  }
  else if (msg.type === 'res' && msg.id === 'connect-1') {
    if (msg.ok) {
      console.log('✅ AUTH SUCCESS');
      console.log('Available methods:', msg.payload.methods?.slice(0, 10));

      // Send chat.send command
      ws.send(JSON.stringify({
        type: 'req',
        id: 'chat-1',
        method: 'chat.send',
        params: {
          sessionKey: 'agent:main:main',
          message: 'echo hello world',
          idempotencyKey: crypto.randomUUID()
        }
      }));
      console.log('📤 chat.send sent');
    } else {
      console.log('❌ AUTH FAILED:', msg.error);
      ws.close();
    }
  }
  else if (msg.type === 'res' && msg.id === 'chat-1') {
    console.log('✅ chat.send response:', msg.ok ? 'OK' : 'FAILED');
    if (!msg.ok) console.log('Error:', msg.error);
  }
  else if (msg.type === 'event' && msg.event === 'agent') {
    console.log('🤖 agent event:', JSON.stringify(msg.payload).substring(0, 200));
  }
  else if (msg.type === 'event') {
    console.log(`📢 event: ${msg.event}`);
  }
});

ws.on('close', (code, reason) => {
  console.log(`🔌 closed: ${code} ${reason}`);
  process.exit(0);
});

ws.on('error', (err) => {
  console.log('❌ error:', err.message);
});

setTimeout(() => {
  console.log('⏱️  timeout - closing');
  ws.close();
}, 15000);
