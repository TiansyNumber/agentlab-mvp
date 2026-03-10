import WebSocket from 'ws';

const ws = new WebSocket('ws://localhost:18889');

ws.on('open', () => {
  console.log('✅ Connected');
});

ws.on('message', (data) => {
  const msg = JSON.parse(data.toString());
  console.log('📥', JSON.stringify(msg));
  
  if (msg.event === 'connect.challenge') {
    // Correct format: type="req" not "request"
    const auth = {
      type: 'req',
      id: 'auth-1',
      method: 'connect.authenticate',
      params: { nonce: msg.payload.nonce }
    };
    console.log('📤', JSON.stringify(auth));
    ws.send(JSON.stringify(auth));
  } else if (msg.type === 'res' && msg.id === 'auth-1') {
    console.log('✅ Auth success!');
    // Try session.prompt
    const prompt = {
      type: 'req',
      id: 'prompt-1',
      method: 'session.prompt',
      params: {
        sessionKey: 'agent:main:main',
        prompt: 'Hello from AgentLab'
      }
    };
    console.log('📤', JSON.stringify(prompt));
    ws.send(JSON.stringify(prompt));
  }
});

ws.on('close', (code, reason) => {
  console.log(`🔌 code=${code} reason=${reason}`);
  process.exit(0);
});

setTimeout(() => ws.close(), 10000);
