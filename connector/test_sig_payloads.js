import WebSocket from 'ws';
import crypto from 'crypto';

const DEVICE_ID = '5bc808a871c3cf6bb7db82b4901fdfc227ee5a3c64a7d35c2c8050efd04443c7';
const PUBLIC_KEY = 'vGMD5taO3_6GooD-tAvRbhJS5I_GRTYS5wIAg_4gsFU';
const PRIVATE_KEY_PEM = `-----BEGIN PRIVATE KEY-----
MC4CAQAwBQYDK2VwBCIEICDY5FtZVSFgAVR+w3+jo3PlN6OJ6CiP14rcdVag/BVs
-----END PRIVATE KEY-----`;

const payloads = [
  (nonce, ts) => nonce,
  (nonce, ts) => `${nonce}:${ts}`,
  (nonce, ts) => `${DEVICE_ID}:${nonce}`,
  (nonce, ts) => `${DEVICE_ID}:${nonce}:${ts}`,
  (nonce, ts) => JSON.stringify({nonce, signedAt: ts}),
  (nonce, ts) => JSON.stringify({deviceId: DEVICE_ID, nonce, signedAt: ts})
];

let testIndex = 0;

function runTest() {
  if (testIndex >= payloads.length) {
    console.log('❌ All signature payloads failed');
    process.exit(1);
  }

  const ws = new WebSocket('ws://localhost:18889');
  
  ws.on('open', () => {
    console.log(`\n[Test ${testIndex + 1}/${payloads.length}] WebSocket open`);
  });

  ws.on('message', (data) => {
    const msg = JSON.parse(data.toString());

    if (msg.event === 'connect.challenge') {
      const nonce = msg.payload.nonce;
      const signedAt = Date.now();
      
      const payloadStr = payloads[testIndex](nonce, signedAt);
      console.log(`Payload: ${payloadStr.substring(0, 80)}${payloadStr.length > 80 ? '...' : ''}`);
      
      const signData = Buffer.from(payloadStr);
      const privateKey = crypto.createPrivateKey(PRIVATE_KEY_PEM);
      const signature = crypto.sign(null, signData, privateKey).toString('base64url');
      
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
            publicKey: PUBLIC_KEY,
            signature: signature,
            signedAt: signedAt,
            nonce: nonce
          }
        }
      };
      ws.send(JSON.stringify(connect));
    } else if (msg.type === 'res' && msg.id === 'connect-1') {
      if (msg.ok) {
        console.log('✅ AUTH SUCCESS!');
        ws.close();
        process.exit(0);
      } else {
        console.log(`❌ Failed: ${msg.error.message}`);
        ws.close();
      }
    }
  });

  ws.on('close', () => {
    testIndex++;
    setTimeout(runTest, 500);
  });

  setTimeout(() => ws.close(), 5000);
}

runTest();
