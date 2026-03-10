import WebSocket from 'ws';

const ws = new WebSocket('ws://localhost:18889');

ws.on('open', () => {
  console.log('✅ Connected');
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
        minProtocol: 1,
        maxProtocol: 1,
        client: {
          id: 'agentlab-connector',
          version: '0.1.0',
          platform: 'node',
          mode: 'headless'
        }
      }
    };
    console.log('📤', JSON.stringify(connect));
    ws.send(JSON.stringify(connect));
  } else if (msg.type === 'res' && msg.id === 'connect-1' && msg.ok) {
    console.log('✅ Handshake SUCCESS!');
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
  }
});

ws.on('close', (code, reason) => {
  console.log(`🔌 code=${code} reason=${reason}`);
  process.exit(0);
});

setTimeout(() => ws.close(), 15000);
