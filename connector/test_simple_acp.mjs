import WebSocket from 'ws';

const ws = new WebSocket('ws://localhost:18889');
let receivedChallenge = false;

ws.on('open', () => {
  console.log('✅ Connected');
});

ws.on('message', (data) => {
  const msg = JSON.parse(data.toString());
  console.log('📥', JSON.stringify(msg));
  
  if (msg.event === 'connect.challenge' && !receivedChallenge) {
    receivedChallenge = true;
    // Try minimal auth - just acknowledge the challenge
    const auth = {
      type: 'request',
      id: '1',
      method: 'connect.authenticate',
      params: {}
    };
    console.log('📤', JSON.stringify(auth));
    ws.send(JSON.stringify(auth));
  }
});

ws.on('close', (code, reason) => {
  console.log(`🔌 code=${code} reason=${reason}`);
  process.exit(0);
});

setTimeout(() => ws.close(), 5000);
