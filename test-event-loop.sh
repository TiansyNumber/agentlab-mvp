#!/bin/bash
# Test real runtime event feedback loop

API_URL="http://localhost:8787"

echo "=== Testing Real Runtime Event Feedback Loop ==="
echo ""

# Step 1: Register runtime
echo "1. Registering real runtime..."
RUNTIME_RESPONSE=$(curl -s -X POST "$API_URL/api/runtimes" \
  -H "Content-Type: application/json" \
  -d '{
    "owner": "test-user",
    "runtime_type": "openclaw",
    "runtime_mode": "real",
    "capabilities": ["agent"],
    "device_id": "test-device-loop",
    "gateway_url": "https://httpbin.org"
  }')

RUNTIME_ID=$(echo "$RUNTIME_RESPONSE" | grep -o '"runtime_id":"[^"]*"' | cut -d'"' -f4)
echo "Runtime ID: $RUNTIME_ID"
echo ""

# Step 2: Start experiment
echo "2. Starting experiment..."
EXP_RESPONSE=$(curl -s -X POST "$API_URL/api/experiments/start" \
  -H "Content-Type: application/json" \
  -d "{
    \"runtime_id\": \"$RUNTIME_ID\",
    \"owner\": \"test-user\",
    \"task\": \"Test event feedback loop\"
  }")

EXP_ID=$(echo "$EXP_RESPONSE" | grep -o '"id":"[^"]*"' | cut -d'"' -f4)
echo "Experiment ID: $EXP_ID"
echo ""

# Step 3: Poll events
echo "3. Polling events (10 seconds)..."
for i in {1..5}; do
  sleep 2
  echo "--- Poll $i ---"
  curl -s "$API_URL/api/experiments/$EXP_ID/events" | jq -r '.[] | "\(.type): \(.message)"'
  echo ""
done

echo "=== Test Complete ==="
