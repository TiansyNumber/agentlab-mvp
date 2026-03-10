#!/bin/bash
set -e

echo "🧪 Testing OpenClaw Gateway WebSocket Integration"
echo ""

# Kill existing connector
pkill -f "node dist/cli.js" || true
sleep 1

# Start connector with dispatch server
echo "1️⃣ Starting connector with dispatch server..."
node dist/cli.js start --backend http://localhost:8787 --gateway http://localhost:18889 --name "test-ws-runtime" > /tmp/connector-ws.log 2>&1 &
CONNECTOR_PID=$!
sleep 5

# Check if connector started
if ! ps -p $CONNECTOR_PID > /dev/null; then
  echo "❌ Connector failed to start"
  cat /tmp/connector-ws.log
  exit 1
fi

echo "✅ Connector started (PID: $CONNECTOR_PID)"

# Get runtime_id from connector log
RUNTIME_ID=$(grep "Runtime registered:" /tmp/connector-ws.log | grep -o '[0-9a-f-]\{36\}' | head -1)
echo "2️⃣ Runtime registered: $RUNTIME_ID"
echo ""

# Start experiment
echo "3️⃣ Starting experiment with Gateway WebSocket..."
RESPONSE=$(curl -s -X POST http://localhost:8787/api/experiments/start \
  -H "Content-Type: application/json" \
  -d "{
    \"runtime_id\": \"$RUNTIME_ID\",
    \"owner\": \"test-user\",
    \"task\": \"Test Gateway WebSocket integration\"
  }")

echo "Response: $RESPONSE"
EXPERIMENT_ID=$(echo $RESPONSE | grep -o '"id":"[^"]*"' | cut -d'"' -f4)

if [ -z "$EXPERIMENT_ID" ]; then
  echo "❌ Failed to get experiment_id"
  kill $CONNECTOR_PID
  exit 1
fi

echo "✅ Experiment ID: $EXPERIMENT_ID"
echo ""

# Wait for WebSocket events
echo "4️⃣ Waiting for Gateway WebSocket events..."
sleep 8

# Check events
EVENTS=$(curl -s "http://localhost:8787/api/experiments/$EXPERIMENT_ID/events")
echo ""
echo "📊 Events received:"
echo "$EVENTS" | jq '.' 2>/dev/null || echo "$EVENTS"
echo ""

# Check for WebSocket events
if echo "$EVENTS" | grep -q "gateway_ws"; then
  echo "✅ Gateway WebSocket events detected!"
  
  if echo "$EVENTS" | grep -q "gateway_ws_connected"; then
    echo "✅ WebSocket connection successful!"
  fi
  
  if echo "$EVENTS" | grep -q "gateway_ws_message_sent"; then
    echo "✅ Message sent to Gateway!"
  fi
  
  if echo "$EVENTS" | grep -q "gateway_ws_message_received"; then
    echo "✅ Message received from Gateway!"
  fi
else
  echo "⚠️  No Gateway WebSocket events found"
fi

# Check connector log
echo ""
echo "📋 Connector log (last 30 lines):"
tail -30 /tmp/connector-ws.log

# Cleanup
kill $CONNECTOR_PID
echo ""
echo "✅ Test complete"
