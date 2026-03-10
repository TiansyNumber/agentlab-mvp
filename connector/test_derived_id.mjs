import WebSocket from 'ws';
import crypto from 'crypto';

const keyPair = crypto.generateKeyPairSync('ed25519');
const publicKeyDer = keyPair.publicKey.export({ type: 'spki', format: 'der' });
const publicKey = publicKeyDer.toString('base64url');
const deviceId = crypto.createHash('sha256').update(publicKeyDer).digest('hex');

console.log('Device ID (derived):', deviceId);
console.log('Public Key:', publicKey);

const ws = new WebSocket('ws://localhost:18889');

ws.on('open', () => {
  console.log('✅ WebSocket open');
});

ws.on('message', (data) => {
  const msg = JSON.parse(data.toString());
  console.log('📥', JSON.stringify(msg, null, 2));

  if (msg.event === 'connect.challenge') {
    const nonce = msg.payload.nonce;
    const signedAt = Date.now();
    const signData = Buffer.from(`${deviceId}:${nonce}:${signedAt}`);
    const signature = crypto.sign(null, signData, keyPair.privateKey).toString('base64url');

    const connect = {
      type: 'req',
      id: 'connect-1',
      method: 'connect',
      params: {
        minProtocol: 3,
        maxProtocol: 3,
        client: {
          id: 'gateway-client',
          displayName: 'AgentLab-Connector',
          version: '0.1.0',
          platform: 'darwin',
          mode: 'backend'
        },
        device: {
          id: deviceId,
          publicKey: publicKey,
          signature: signature,
          signedAt: signedAt,
          nonce: nonce
        },
        role: 'operator',
        scopes: ['operator.admin']
      }
    };
    console.log('📤 Pairing with derived deviceId');
    ws.send(JSON.stringify(connect));
  } else if (msg.type === 'res' && msg.id === 'connect-1') {
    console.log(msg.ok ? '✅ SUCCESS!' : '❌ FAILED:', msg.error || msg.payload);
  }
});

ws.on('close', (code, reason) => {
  console.log(`🔌 ${code} ${reason}`);
  process.exit(0);
});

setTimeout(() => ws.close(), 30000);
