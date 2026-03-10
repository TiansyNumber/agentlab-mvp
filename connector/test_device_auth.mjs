import WebSocket from 'ws';
import crypto from 'crypto';

const DEVICE_ID = '5bc808a871c3cf6bb7db82b4901fdfc227ee5a3c64a7d35c2c8050efd04443c7';
const PUBLIC_KEY = 'vGMD5taO3_6GooD-tAvRbhJS5I_GRTYS5wIAg_4gsFU';

let challengeNonce = null;

const ws = new WebSocket('ws://localhost:18889');

ws.on('open', () => {
  console.log('✅ WebSocket open');
});

ws.on('message', (data) => {
  const msg = JSON.parse(data.toString());
  console.log('📥', JSON.stringify(msg, null, 2));

  if (msg.event === 'connect.challenge') {
    challengeNonce = msg.payload.nonce;

    const signedAt = Date.now();
    const signaturePayload = `${DEVICE_ID}:${challengeNonce}:${signedAt}`;
    const signature = crypto.createHash('sha256').update(signaturePayload).digest('base64url');

    const connect = {
      type: 'req',
      id: 'connect-1',
      method: 'connect',
      params: {
        minProtocol: 3,
        maxProtocol: 3,
        client: {
          id: 'gateway-client',
          version: '0.1.0',
          platform: 'darwin',
          mode: 'backend'
        },
        device: {
          id: DEVICE_ID,
          publicKey: PUBLIC_KEY,
          signature: signature,
          signedAt: signedAt,
          nonce: challengeNonce
        }
      }
    };
    console.log('📤 Sending connect with device signature');
    ws.send(JSON.stringify(connect));
  } else if (msg.type === 'res' && msg.id === 'connect-1') {
    if (msg.ok) {
      console.log('✅ HANDSHAKE SUCCESS!');
      const prompt = {
        type: 'req',
        id: 'prompt-1',
        method: 'session.prompt',
        params: {
          sessionKey: 'agent:main:main',
          prompt: 'Say hello'
        }
      };
      console.log('📤 Sending prompt');
      ws.send(JSON.stringify(prompt));
    } else {
      console.log('❌ HANDSHAKE FAILED:', msg.error);
    }
  }
});

ws.on('close', (code, reason) => {
  console.log(`🔌 code=${code} reason=${reason}`);
  process.exit(0);
});

setTimeout(() => ws.close(), 20000);
