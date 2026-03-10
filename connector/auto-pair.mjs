import { AgentLabConnector } from './dist/connector.js';

const config = {
  backend: 'http://localhost:8787',
  gateway: 'ws://localhost:8080',
  name: 'Auto-Paired Runtime'
};

const connector = new AgentLabConnector(config);

console.log('🔗 AgentLab Auto-Pairing Connector');
console.log('================================\n');

try {
  console.log('📡 Checking backend...');
  await connector.checkBackend();
  console.log('✅ Backend reachable\n');

  console.log('🔐 Requesting pairing...');
  const { pairing_code, runtime_id } = await connector.requestPairing();

  console.log('\n╔════════════════════════════════════════╗');
  console.log('║                                        ║');
  console.log(`║   Pairing Code: ${pairing_code.padEnd(22)}║`);
  console.log('║                                        ║');
  console.log('╚════════════════════════════════════════╝\n');
  console.log(`Runtime ID: ${runtime_id}`);
  console.log('\n📱 在 AgentLab UI 中输入此配对码完成连接\n');

  const dispatchPort = 18890;
  await connector.startDispatchServer(dispatchPort);
  const dispatchUrl = `http://127.0.0.1:${dispatchPort}`;

  console.log('🔗 Completing pairing with gateway...');
  await connector.completePairingWithGateway(dispatchUrl);
  console.log('✅ Pairing completed\n');

  connector.startHeartbeat(30000);
  console.log('💚 Heartbeat started (30s interval)');
  console.log('🎯 Ready to receive experiments\n');

} catch (err) {
  console.error('❌ Error:', err.message);
  process.exit(1);
}
