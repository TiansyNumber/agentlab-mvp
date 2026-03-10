#!/bin/bash
# Test CLI Connector registration

echo "Testing AgentLab CLI Connector..."
echo ""

cd connector
node dist/cli.js start --backend https://agentlab-backend.tianshuyun.workers.dev --gateway http://localhost:18889 --name "Test Local Runtime" &

CONNECTOR_PID=$!
echo "Connector PID: $CONNECTOR_PID"

sleep 5

echo ""
echo "Checking registered runtimes..."
curl -s https://agentlab-backend.tianshuyun.workers.dev/api/runtimes | jq '.'

echo ""
echo "Stopping connector..."
kill $CONNECTOR_PID

echo "Test complete."
