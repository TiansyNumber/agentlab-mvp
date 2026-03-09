#!/bin/bash
# Test script for real OpenClaw runtime registration

API_BASE="https://agentlab-backend.supertiansy.workers.dev"

echo "=== Testing Real Runtime Registration ==="
echo ""

echo "1. Registering a real runtime..."
RUNTIME_RESPONSE=$(curl -s -X POST "$API_BASE/api/runtimes" \
  -H "Content-Type: application/json" \
  -d '{
    "owner": "test-user",
    "type": "openclaw",
    "runtime_mode": "real",
    "device_id": "device-test-001",
    "gateway_url": "https://gateway.openclaw.example.com",
    "capabilities": ["web-browsing", "code-execution"]
  }')

echo "$RUNTIME_RESPONSE" | jq .
RUNTIME_ID=$(echo "$RUNTIME_RESPONSE" | jq -r '.id')
echo ""
echo "Runtime ID: $RUNTIME_ID"
echo ""

echo "2. Listing all runtimes..."
curl -s "$API_BASE/api/runtimes" | jq .
echo ""

echo "3. Starting an experiment on the real runtime..."
EXPERIMENT_RESPONSE=$(curl -s -X POST "$API_BASE/api/experiments/start" \
  -H "Content-Type: application/json" \
  -d "{
    \"runtime_id\": \"$RUNTIME_ID\",
    \"owner\": \"test-user\",
    \"task\": \"Test task for real runtime\"
  }")

echo "$EXPERIMENT_RESPONSE" | jq .
EXPERIMENT_ID=$(echo "$EXPERIMENT_RESPONSE" | jq -r '.id')
echo ""
echo "Experiment ID: $EXPERIMENT_ID"
echo ""

echo "4. Checking experiment events..."
sleep 2
curl -s "$API_BASE/api/experiments/$EXPERIMENT_ID/events" | jq .
echo ""

echo "=== Test Complete ==="
