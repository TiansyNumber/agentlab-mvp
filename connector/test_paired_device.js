import WebSocket from 'ws';
import crypto from 'crypto';

const DEVICE_ID = '4369d78d7c59e0a1929b4741e245f49f1dc508f85d2114e69f6e03be9d47be9a';
const PUBLIC_KEY = 'zm3DgthkzufLksZX7EM0e5rnVt9wcX-Jpvc7CvkHR_Q';
const DEVICE_TOKEN = 'I2rsOAxdsCgtk5qDu_nkIKClnhqbI_cJgnC9zUneF0k';

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
          id: 'node-host',
          version: '0.1.0',
          platform: 'darwin',
          mode: 'backend'
        },
        device: {
          id: DEVICE_ID,
          publicKey: PUBLIC_KEY
        },
        auth: {
          token: DEVICE_TOKEN
        }
      }
    };
    console.log('📤 Sending connect with paired device + token (no signature)');
    ws.send(JSON.stringify(connect));
  } else if (msg.type === 'res' && msg.id === 'connect-1') {
    if (msg.ok) {
      console.log('✅ AUTH SUCCESS!');
      const prompt = {
        type: 'req',
        id: 'prompt-1',
        method: 'session.prompt',
        params: {
          sessionKey: 'agent:main:main',
          prompt: 'hello'
        }
      };
      console.log('📤 Sending prompt');
      ws.send(JSON.stringify(prompt));
    } else {
      console.log('❌ AUTH FAILED:', msg.error);
    }
  } else if (msg.type === 'res' && msg.id === 'prompt-1') {
    console.log('✅ PROMPT RESPONSE:', msg.ok ? 'SUCCESS' : 'FAILED');
    if (msg.ok) console.log('Payload:', msg.payload);
    ws.close();
  }
});

ws.on('close', (code, reason) => {
  console.log(`🔌 ${code} ${reason}`);
  process.exit(0);
});

setTimeout(() => ws.close(), 30000);
