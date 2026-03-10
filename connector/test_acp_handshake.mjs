import WebSocket from 'ws';

const ws = new WebSocket('ws://localhost:18889');

ws.on('open', () => {
  console.log('✅ Connected to Gateway');
});

ws.on('message', (data) => {
  const msg = JSON.parse(data.toString());
  console.log('📥 Received:', JSON.stringify(msg, null, 2));
  
  if (msg.type === 'event' && msg.event === 'connect.challenge') {
    console.log('\n🔐 Received auth challenge, responding...');
    const response = {
      type: 'request',
      id: 'auth-1',
      method: 'connect.authenticate',
      params: {
        nonce: msg.payload.nonce,
      }
    };
    console.log('📤 Sending:', JSON.stringify(response, null, 2));
    ws.send(JSON.stringify(response));
  } else if (msg.type === 'response' && msg.id === 'auth-1') {
    console.log('\n✅ Auth response received');
    const sessionReq = {
      type: 'request',
      id: 'session-1',
      method: 'session.create',
      params: {
        sessionKey: 'test-session-' + Date.now()
      }
    };
    console.log('📤 Creating session:', JSON.stringify(sessionReq, null, 2));
    ws.send(JSON.stringify(sessionReq));
  } else if (msg.type === 'response' && msg.id === 'session-1') {
    console.log('\n✅ Session created');
    setTimeout(() => ws.close(), 1000);
  }
});

ws.on('error', (err) => {
  console.error('❌ Error:', err.message);
});

ws.on('close', (code, reason) => {
  console.log(`\n🔌 Closed: code=${code}, reason=${reason.toString()}`);
  process.exit(0);
});

setTimeout(() => {
  console.log('\n⏱️  Timeout');
  ws.close();
}, 10000);
