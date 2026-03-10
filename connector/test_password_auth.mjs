import WebSocket from 'ws';

const ws = new WebSocket('ws://localhost:18889');

ws.on('open', () => {
  console.log('✅ WebSocket open');
});

ws.on('message', (data) => {
  const msg = JSON.parse(data.toString());
  console.log('📥', JSON.stringify(msg));
  
  if (msg.event === 'connect.challenge') {
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
          platform: 'node',
          mode: 'backend'
        },
        auth: {
          password: ''
        }
      }
    };
    console.log('📤 Sending connect with password auth');
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
      ws.send(JSON.stringify(prompt));
    } else {
      console.log('❌ Connect failed:', msg.error);
    }
  } else if (msg.type === 'res' && msg.id === 'prompt-1') {
    console.log('✅ PROMPT RESPONSE:', msg);
  }
});

ws.on('close', (code, reason) => {
  console.log(`🔌 code=${code} reason=${reason}`);
  process.exit(0);
});

setTimeout(() => ws.close(), 15000);
