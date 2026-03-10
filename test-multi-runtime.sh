#!/bin/bash

echo "🧪 Multi-Runtime Verification Test"
echo "=================================="
echo ""

BACKEND="http://localhost:8787"

echo "1️⃣ Testing auto-pairing flow..."
echo ""

# Simulate first runtime requesting pairing
echo "📡 Runtime 1: Requesting pairing..."
RESULT1=$(curl -s -X POST "$BACKEND/api/pairing/request" \
  -H "Content-Type: application/json" \
  -d '{
    "runtime_type": "openclaw",
    "runtime_mode": "real",
    "display_name": "Test Runtime 1",
    "device_id": "device-test-001"
  }')

CODE1=$(echo $RESULT1 | jq -r '.pairing_code')
RUNTIME1=$(echo $RESULT1 | jq -r '.runtime_id')

echo "✅ Runtime 1 pairing code: $CODE1"
echo "   Runtime ID: $RUNTIME1"
echo ""

# Simulate second runtime requesting pairing
echo "📡 Runtime 2: Requesting pairing..."
RESULT2=$(curl -s -X POST "$BACKEND/api/pairing/request" \
  -H "Content-Type: application/json" \
  -d '{
    "runtime_type": "openclaw",
    "runtime_mode": "real",
    "display_name": "Test Runtime 2",
    "device_id": "device-test-002"
  }')

CODE2=$(echo $RESULT2 | jq -r '.pairing_code')
RUNTIME2=$(echo $RESULT2 | jq -r '.runtime_id')

echo "✅ Runtime 2 pairing code: $CODE2"
echo "   Runtime ID: $RUNTIME2"
echo ""

# Complete pairing for both runtimes
echo "2️⃣ Completing pairing..."
echo ""

curl -s -X POST "$BACKEND/api/pairing/complete" \
  -H "Content-Type: application/json" \
  -d "{\"runtime_id\": \"$RUNTIME1\", \"gateway_url\": \"http://localhost:18890\"}" > /dev/null

echo "✅ Runtime 1 paired"

curl -s -X POST "$BACKEND/api/pairing/complete" \
  -H "Content-Type: application/json" \
  -d "{\"runtime_id\": \"$RUNTIME2\", \"gateway_url\": \"http://localhost:18891\"}" > /dev/null

echo "✅ Runtime 2 paired"
echo ""

# Send heartbeats
echo "3️⃣ Sending heartbeats..."
echo ""

curl -s -X POST "$BACKEND/api/runtimes/heartbeat" \
  -H "Content-Type: application/json" \
  -d "{\"runtime_id\": \"$RUNTIME1\", \"status\": \"online\", \"active_experiments\": 0, \"timestamp\": $(date +%s)000}" > /dev/null

curl -s -X POST "$BACKEND/api/runtimes/heartbeat" \
  -H "Content-Type: application/json" \
  -d "{\"runtime_id\": \"$RUNTIME2\", \"status\": \"online\", \"active_experiments\": 0, \"timestamp\": $(date +%s)000}" > /dev/null

echo "✅ Heartbeats sent"
echo ""

# List all runtimes
echo "4️⃣ Listing all runtimes..."
echo ""

RUNTIMES=$(curl -s "$BACKEND/api/runtimes")
echo "$RUNTIMES" | jq -r '.[] | "  • \(.mode) - \(.status) - Device: \(.device_id // "N/A") - Last seen: \(.last_seen_ms_ago)ms ago"'
echo ""

ONLINE_COUNT=$(echo "$RUNTIMES" | jq '[.[] | select(.status == "online")] | length')
TOTAL_COUNT=$(echo "$RUNTIMES" | jq 'length')

echo "📊 Summary:"
echo "   Total runtimes: $TOTAL_COUNT"
echo "   Online runtimes: $ONLINE_COUNT"
echo ""

if [ "$ONLINE_COUNT" -ge 2 ]; then
  echo "✅ Multi-runtime verification PASSED"
  exit 0
else
  echo "❌ Multi-runtime verification FAILED"
  exit 1
fi
