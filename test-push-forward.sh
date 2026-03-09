#!/bin/bash
set -e

BACKEND_URL="https://agentlab-backend.supertiansy.workers.dev"
GATEWAY_URL="https://httpbin.org"

echo "=== Testing Real Runtime Execution - Push Forward ==="
echo ""

# Step 1: Register runtime
echo "1. Registering real runtime..."
RUNTIME_RESPONSE=$(curl -s -X POST "$BACKEND_URL/api/runtimes" \
  -H "Content-Type: application/json" \
  -d "{
    \"owner\": \"test-user\",
    \"type\": \"openclaw\",
    \"runtime_mode\": \"real\",
    \"device_id\": \"test-device-002\",
    \"gateway_url\": \"$GATEWAY_URL\",
    \"capabilities\": [\"web-browsing\"]
  }")

RUNTIME_ID=$(echo "$RUNTIME_RESPONSE" | grep -o '"runtime_id":"[^"]*"' | cut -d'"' -f4)
echo "Runtime ID: $RUNTIME_ID"
echo ""

# Step 2: Start experiment
echo "2. Starting experiment..."
EXP_RESPONSE=$(curl -s -X POST "$BACKEND_URL/api/experiments/start" \
  -H "Content-Type: application/json" \
  -d "{
    \"runtime_id\": \"$RUNTIME_ID\",
    \"owner\": \"test-user\",
    \"task\": \"Test task to push forward\"
  }")

EXPERIMENT_ID=$(echo "$EXP_RESPONSE" | grep -o '"experiment_id":"[^"]*"' | cut -d'"' -f4)
echo "Experiment ID: $EXPERIMENT_ID"
echo ""

# Step 3: Wait and check events
echo "3. Waiting 3 seconds for execution..."
sleep 3

echo "4. Fetching events..."
curl -s "$BACKEND_URL/api/experiments/$EXPERIMENT_ID/events" | jq '.'
echo ""

echo "=== Test Complete ==="
