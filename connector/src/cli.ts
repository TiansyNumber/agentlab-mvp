#!/usr/bin/env node
import { AgentLabConnector } from './connector.js';

const args = process.argv.slice(2);
const command = args[0];

if (command !== 'start') {
  console.log('Usage: agentlab-connect start [options]');
  console.log('Options:');
  console.log('  --backend <url>   Backend URL (default: http://localhost:8787)');
  console.log('  --gateway <url>   Gateway URL (default: http://localhost:18889)');
  console.log('  --name <name>     Runtime display name (default: Local OpenClaw)');
  process.exit(1);
}

const getArg = (flag: string, defaultValue: string) => {
  const idx = args.indexOf(flag);
  return idx >= 0 && args[idx + 1] ? args[idx + 1] : defaultValue;
};

const config = {
  backend: getArg('--backend', 'http://localhost:8787'),
  gateway: getArg('--gateway', 'http://localhost:18889'),
  name: getArg('--name', 'Local OpenClaw')
};

console.log('🚀 AgentLab Connector V0');
console.log(`Backend: ${config.backend}`);
console.log(`Gateway: ${config.gateway}`);
console.log(`Name: ${config.name}\n`);

const connector = new AgentLabConnector(config);

try {
  console.log('Checking backend reachability...');
  await connector.checkBackend();
  console.log('✅ Backend is reachable\n');

  console.log('Registering runtime...');
  const runtime = await connector.register();
  console.log(`✅ Runtime registered: ${runtime.runtime_id}`);
  console.log(`Status: ${runtime.status}`);
  console.log(`Device ID: ${runtime.device_id}\n`);

  console.log('Starting heartbeat (30s interval)...');
  connector.startHeartbeat();
  console.log('✅ Connector running. Press Ctrl+C to stop.\n');

  process.on('SIGINT', () => {
    console.log('\n🛑 Stopping connector...');
    connector.stop();
    process.exit(0);
  });
} catch (err) {
  console.error('❌ Error:', (err as Error).message);
  process.exit(1);
}
