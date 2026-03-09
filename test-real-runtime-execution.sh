#!/bin/bash
# Test Real Runtime Execution with Observable States

BACKEND_URL="https://agentlab-backend.supertiansy.workers.dev"

echo "=== Testing Real Runtime Execution ==="
echo ""

# Step 1: Register a real runtime
echo "Step 1: Registering real runtime..."
REGISTER_RESPONSE=$(curl -s -X POST "$BACKEND_URL/api/runtimes" \
  -H "Content-Type: application/json" \
  -d '{
    "owner": "test-user",
    "type": "openclaw",
    "runtime_mode": "real",
    "device_id": "test-device-001",
    "gateway_url": "https://gateway.openclaw.example.com",
    "capabilities": ["web-browsing"]
  }')

echo "$REGISTER_RESPONSE" | jq '.'
RUNTIME_ID=$(echo "$REGISTER_RESPONSE" | jq -r '.runtime_id')
echo ""
echo "Runtime ID: $RUNTIME_ID"
echo ""

# Step 2: Start an experiment
echo "Step 2: Starting experiment on real runtime..."
EXPERIMENT_RESPONSE=$(curl -s -X POST "$BACKEND_URL/api/experiments" \
  -H "Content-Type: application/json" \
  -d "{
    \"runtime_id\": \"$RUNTIME_ID\",
    \"owner\": \"test-user\",
    \"task\": \"Test real runtime execution\"
  }")

echo "$EXPERIMENT_RESPONSE" | jq '.'
EXPERIMENT_ID=$(echo "$EXPERIMENT_RESPONSE" | jq -r '.experiment_id')
echo ""
echo "Experiment ID: $EXPERIMENT_ID"
echo ""

# Step 3: Poll for events to see observable states
echo "Step 3: Polling for experiment events (observable states)..."
sleep 2

for i in {1..5}; do
  echo "--- Poll attempt $i ---"
  curl -s "$BACKEND_URL/api/experiments/$EXPERIMENT_ID/events" | jq '.'
  echo ""
  sleep 2
done

echo "=== Test Complete ==="
