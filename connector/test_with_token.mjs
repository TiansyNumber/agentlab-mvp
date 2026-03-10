import WebSocket from 'ws';

const OPERATOR_TOKEN = 'louAtSR26dahFmrAqSu3EBRd1sdN355xqVeINX-PkKM';

const ws = new WebSocket('ws://localhost:18889');

ws.on('open', () => {
  console.log('✅ WebSocket open');
});

ws.on('message', (data) => {
  const msg = JSON.parse(data.toString());
  console.log('📥', JSON.stringify(msg, null, 2));

  if (msg.event === 'connect.challenge') {
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
        auth: {
          token: OPERATOR_TOKEN
        }
      }
    };
    console.log('📤 Sending connect with token');
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
