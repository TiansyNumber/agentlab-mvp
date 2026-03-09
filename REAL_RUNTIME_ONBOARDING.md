# Real OpenClaw Runtime Onboarding Guide

## Overview
This document describes how to register and use a **real OpenClaw runtime** with AgentLab.

## Runtime Modes

AgentLab supports three runtime modes:

1. **demo** - Pure demonstration mode, no actual execution
2. **simulated** - Simulated OpenClaw behavior with stub responses
3. **real** - Real OpenClaw Gateway connection (requires actual device)

## Real Runtime Requirements

To register a **real** OpenClaw runtime, you MUST provide:

- `runtime_mode`: "real"
- `device_id`: Your OpenClaw device identifier (e.g., "device-abc123")
- `gateway_url`: Your OpenClaw Gateway URL (e.g., "https://gateway.openclaw.ai")
- `owner`: User identifier

## Registration Flow

### Via Frontend UI

1. Navigate to "Runtime 管理" (Runtime Manager)
2. Select Mode: "Real (真实 OpenClaw Gateway)"
3. Fill in required fields:
   - Owner: your user ID
   - Device ID: your OpenClaw device ID
   - Gateway URL: your OpenClaw Gateway endpoint
4. Click "注册 Runtime"

### Via API

```bash
curl -X POST https://agentlab-backend.supertiansy.workers.dev/api/runtimes \
  -H "Content-Type: application/json" \
  -d '{
    "owner": "your-user-id",
    "type": "openclaw",
    "runtime_mode": "real",
    "device_id": "device-abc123",
    "gateway_url": "https://gateway.openclaw.ai",
    "capabilities": ["web-browsing", "code-execution"]
  }'
```

## Current Status

### ✅ Implemented
- Backend validation for real runtime fields
- Frontend UI with conditional fields for real mode
- API endpoints for runtime registration
- Runtime listing with mode display

### ⚠️ Partially Implemented
- Real OpenClaw Gateway integration (adapter exists but not fully tested)
- Experiment execution on real runtime (routing works, actual execution untested)

### ❌ Not Yet Implemented
- Real device authentication/signature verification
- Gateway health checks
- Real experiment result streaming from Gateway

## Testing Real Runtime

### Step 1: Register a Real Runtime
Use the frontend or API to register with your actual device_id and gateway_url.

### Step 2: Verify Registration
Check that the runtime appears in the list with mode="real".

### Step 3: Start an Experiment
Select the real runtime and start an experiment. The system will:
- Route to OpenClawAdapter
- Attempt to call your gateway_url
- Return results (or errors if gateway is unreachable)

## Known Limitations

1. **No Gateway Verification**: System does not verify gateway_url is reachable during registration
2. **No Device Authentication**: device_id is stored but not used for signature verification yet
3. **Stub Responses**: If gateway is unreachable, system may fall back to stub responses
4. **No Real Streaming**: Events are generated as stubs, not streamed from real gateway

## Next Steps

To achieve full real runtime integration:
1. Implement gateway health check during registration
2. Add device signature authentication
3. Implement real event streaming from gateway
4. Add gateway connection status monitoring
5. Handle gateway errors gracefully
