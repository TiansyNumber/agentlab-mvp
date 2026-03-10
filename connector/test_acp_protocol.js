import WebSocket from 'ws';

const DEVICE_TOKEN = 'I2rsOAxdsCgtk5qDu_nkIKClnhqbI_cJgnC9zUneF0k';

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
          id: 'node-host',
          version: '0.1.0',
          platform: 'darwin',
          mode: 'backend'
        },
        auth: {
          token: DEVICE_TOKEN
        }
      }
    };
    console.log('📤 Sending connect with device token');
    ws.send(JSON.stringify(connect));
  } else if (msg.type === 'res' && msg.id === 'connect-1') {
    if (msg.ok) {
      console.log('✅ AUTH SUCCESS!');
      const prompt = {
        type: 'req',
        id: 'prompt-1',
        method: 'session.prompt',
        params: {
          sessionKey: 'agent:main:main',
          prompt: 'hello'
        }
      };
      console.log('📤 Sending prompt');
      ws.send(JSON.stringify(prompt));
    } else {
      console.log('❌ AUTH FAILED:', msg.error);
    }
  } else if (msg.type === 'res' && msg.id === 'prompt-1') {
    console.log('✅ PROMPT RESPONSE:', msg.ok ? 'SUCCESS' : 'FAILED');
    ws.close();
  }
});

ws.on('close', (code, reason) => {
  console.log(`🔌 ${code} ${reason}`);
  process.exit(0);
});

setTimeout(() => ws.close(), 30000);
