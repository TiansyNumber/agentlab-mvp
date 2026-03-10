import WebSocket from 'ws';
import crypto from 'crypto';

const ws = new WebSocket('ws://localhost:18889');

const deviceId = crypto.randomBytes(32).toString('hex');
const keyPair = crypto.generateKeyPairSync('ed25519');
const publicKey = keyPair.publicKey.export({ type: 'spki', format: 'der' }).toString('base64url');

console.log('Device ID:', deviceId);
console.log('Public Key:', publicKey);

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
          id: 'node-host',
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
        scopes: ['operator.admin', 'operator.read', 'operator.write']
      }
    };
    console.log('📤 Sending pairing request');
    ws.send(JSON.stringify(connect));
  } else if (msg.type === 'res' && msg.id === 'connect-1') {
    if (msg.ok) {
      console.log('✅ PAIRING SUCCESS!');
    } else {
      console.log('❌ PAIRING FAILED:', msg.error);
    }
  }
});

ws.on('close', (code, reason) => {
  console.log(`🔌 code=${code} reason=${reason}`);
  process.exit(0);
});

setTimeout(() => ws.close(), 20000);
