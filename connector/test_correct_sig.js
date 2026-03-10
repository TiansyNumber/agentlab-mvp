import WebSocket from 'ws';
import crypto from 'crypto';

const DEVICE_ID = '5bc808a871c3cf6bb7db82b4901fdfc227ee5a3c64a7d35c2c8050efd04443c7';
const PUBLIC_KEY = 'vGMD5taO3_6GooD-tAvRbhJS5I_GRTYS5wIAg_4gsFU';
const PRIVATE_KEY_PEM = `-----BEGIN PRIVATE KEY-----
MC4CAQAwBQYDK2VwBCIEICDY5FtZVSFgAVR+w3+jo3PlN6OJ6CiP14rcdVag/BVs
-----END PRIVATE KEY-----`;

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
    const clientId = 'node-host';
    const clientMode = 'backend';
    const role = 'operator';
    const scopes = 'operator.admin';
    const token = '';
    
    const payload = `v2|${DEVICE_ID}|${clientId}|${clientMode}|${role}|${scopes}|${signedAt}|${token}|${nonce}`;
    
    const privateKey = crypto.createPrivateKey(PRIVATE_KEY_PEM);
    const signature = crypto.sign(null, Buffer.from(payload, 'utf8'), privateKey).toString('base64url');
    
    const connect = {
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
          id: DEVICE_ID,
          publicKey: PUBLIC_KEY,
          signature: signature,
          signedAt: signedAt,
          nonce: nonce
        },
        role: role,
        scopes: [scopes]
      }
    };
    console.log('📤 Sending connect');
    ws.send(JSON.stringify(connect));
  } else if (msg.type === 'res' && msg.id === 'connect-1') {
    if (msg.ok) {
      console.log('✅ AUTH SUCCESS!');
      const statusReq = {
        type: 'req',
        id: 'status-1',
        method: 'status',
        params: {}
      };
      console.log('📤 Sending status request');
      ws.send(JSON.stringify(statusReq));
    } else {
      console.log('❌ AUTH FAILED:', msg.error);
      ws.close();
    }
  } else if (msg.type === 'res' && msg.id === 'status-1') {
    console.log('✅ STATUS RESPONSE:', msg.ok ? 'SUCCESS' : 'FAILED');
    ws.close();
  }
});

ws.on('close', (code, reason) => {
  console.log(`🔌 ${code} ${reason}`);
  process.exit(0);
});

setTimeout(() => ws.close(), 30000);
