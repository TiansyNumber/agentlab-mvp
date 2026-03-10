import WebSocket from 'ws';

const ws = new WebSocket('ws://localhost:18889');

ws.on('open', () => {
  console.log('✅ Connected to Gateway');
  
  // Test different message formats
  const tests = [
    { name: 'ping', msg: { type: 'ping' } },
    { name: 'session_create', msg: { type: 'session_create', sessionId: 'test-session-1' } },
    { name: 'prompt', msg: { type: 'prompt', sessionId: 'test-session-1', content: 'hello' } },
  ];
  
  let idx = 0;
  const sendNext = () => {
    if (idx >= tests.length) {
      setTimeout(() => ws.close(), 1000);
      return;
    }
    const test = tests[idx++];
    console.log(`\n📤 Test ${idx}: ${test.name}`);
    console.log('   Sending:', JSON.stringify(test.msg));
    ws.send(JSON.stringify(test.msg));
    setTimeout(sendNext, 1500);
  };
  
  sendNext();
});

ws.on('message', (data) => {
  console.log('📥 Received:', data.toString());
});

ws.on('error', (err) => {
  console.error('❌ Error:', err.message);
});

ws.on('close', (code, reason) => {
  console.log(`\n🔌 Closed: code=${code}, reason=${reason.toString()}`);
  process.exit(0);
});
