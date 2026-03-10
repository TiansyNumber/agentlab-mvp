import WebSocket from 'ws';

const ws = new WebSocket('ws://localhost:18889');

ws.on('open', () => {
  console.log('✅ Connected to Gateway');
});

ws.on('message', (data) => {
  const msg = JSON.parse(data.toString());
  console.log('📥 Received:', JSON.stringify(msg, null, 2));
  
  if (msg.type === 'event' && msg.event === 'connect.challenge') {
    console.log('\n🔐 Received auth challenge');
    // Try with empty password (approval_mode: off in config)
    const response = {
      type: 'request',
      id: 'auth-1',
      method: 'connect.authenticate',
      params: {
        nonce: msg.payload.nonce,
        password: ''
      }
    };
    console.log('📤 Auth with empty password');
    ws.send(JSON.stringify(response));
  } else if (msg.type === 'error') {
    console.log('\n❌ Error response:', msg);
  } else if (msg.type === 'response') {
    console.log('\n✅ Success:', msg);
    if (msg.id === 'auth-1') {
      // Auth succeeded, try prompt
      const promptReq = {
        type: 'request',
        id: 'prompt-1',
        method: 'session.prompt',
        params: {
          sessionKey: 'agent:main:main',
          prompt: 'Hello from AgentLab test'
        }
      };
      console.log('📤 Sending prompt:', JSON.stringify(promptReq, null, 2));
      ws.send(JSON.stringify(promptReq));
    }
  }
});

ws.on('error', (err) => {
  console.error('❌ WS Error:', err.message);
});

ws.on('close', (code, reason) => {
  console.log(`\n🔌 Closed: code=${code}, reason=${reason.toString()}`);
  process.exit(0);
});

setTimeout(() => {
  console.log('\n⏱️  Timeout');
  ws.close();
}, 10000);
