import WebSocket from 'ws';
import crypto from 'crypto';

const DEVICE_ID = '12a5aecd74f44fb17ed8808e84c813237a48980bc332f1af917212716d23398a';
const PUBLIC_KEY = 'bjt83No0A_ahY2h8ymHOGEcGVcWlsd9Nb-iWHoVKlqI';
const DEVICE_TOKEN = '-H_ljREiEuA9KMg-NOVFHxFOm9KMyEGJC-2EwjQzz3Q';

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

    const connect = {
      type: 'req',
      id: 'connect-1',
      method: 'connect',
      params: {
        minProtocol: 3,
        maxProtocol: 3,
        client: {
          id: 'gateway-client',
          displayName: 'agentlab-connector',
          version: '0.1.0',
          platform: 'darwin',
          mode: 'backend'
        },
        device: {
          id: DEVICE_ID,
          publicKey: PUBLIC_KEY,
          signature: 'dummy',
          signedAt: signedAt,
          nonce: nonce
        },
        auth: {
          deviceToken: DEVICE_TOKEN
        }
      }
    };
    console.log('📤 Using kimi-bridge device with token');
    ws.send(JSON.stringify(connect));
  } else if (msg.type === 'res' && msg.id === 'connect-1') {
    if (msg.ok) {
      console.log('✅ HANDSHAKE SUCCESS!');
      console.log('Payload:', msg.payload);
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
      console.log('❌ FAILED:', msg.error);
    }
  }
});

ws.on('close', (code, reason) => {
  console.log(`🔌 ${code} ${reason}`);
  process.exit(0);
});

setTimeout(() => ws.close(), 20000);
