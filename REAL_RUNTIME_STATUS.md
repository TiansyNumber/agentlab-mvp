# Real OpenClaw Runtime Integration Status

**Last Updated**: 2026-03-10 00:42 UTC

## Summary

Real OpenClaw runtime onboarding flow is **partially implemented**. Registration works, but actual Gateway connection is not yet implemented.

## What Works ✅

### 1. Runtime Registration
- Frontend UI has conditional fields for real runtime mode
- Backend validates `device_id` and `gateway_url` for real runtimes
- API endpoint: `POST /api/runtimes` accepts real runtime registration
- Runtime listing shows mode (demo/simulated/real)

### 2. Experiment Routing
- Experiments can be started on real runtimes
- Backend correctly routes to OpenClawAdapter
- Runtime mode is passed to adapter

### 3. Mode Distinction
- Three-tier mode system implemented: demo/simulated/real
- Frontend displays mode in runtime list
- Backend enforces field requirements per mode

## What Doesn't Work ❌

### 1. Real Gateway Connection
- OpenClawAdapter throws error for real mode: "Real OpenClaw Gateway connection not yet implemented"
- No actual HTTP calls to gateway_url
- No device signature generation

### 2. Authentication
- device_id stored but not used for authentication
- No private key management
- No signature verification

### 3. Real Event Streaming
- Events are simulated stubs, not from real gateway
- No WebSocket or SSE connection to gateway

## Files Modified

1. `/Users/tianshuyun/agentlab-mvp/backend/src/services/experiment-manager.ts`
   - Fixed: Now passes `runtime_mode` to OpenClawAdapter
   - Fixed: Uses `gateway_url` and `device_id` from runtime for real mode

2. `/Users/tianshuyun/agentlab-mvp/REAL_RUNTIME_ONBOARDING.md`
   - Created: Complete onboarding documentation

3. `/Users/tianshuyun/agentlab-mvp/test-real-runtime.sh`
   - Created: Test script for real runtime registration

## Current Behavior

### Demo Runtime
- No validation required
- Simulated events only
- No external calls

### Simulated Runtime
- No validation required
- Simulated OpenClaw behavior
- No external calls

### Real Runtime
- Requires `device_id` and `gateway_url`
- Registration succeeds
- Experiment start **fails** with: "Real OpenClaw Gateway connection not yet implemented"

## Testing

Run the test script:
```bash
./test-real-runtime.sh
```

Or test via frontend:
1. Open https://agentlab-mvp.pages.dev (if deployed)
2. Go to "Runtime 管理"
3. Select mode: "Real"
4. Fill device_id and gateway_url
5. Click "注册 Runtime"
6. Try to start experiment → will fail at connection

## Deployment Status

- **Backend**: Deployed to https://agentlab-backend.supertiansy.workers.dev
  - Version: bff1f152-aad3-4737-a68a-ed3283586d86
  - Deployed: 2026-03-10 00:41 UTC
- **Frontend**: Built locally (dist/)
  - Not yet deployed to Pages

## Next Steps to Complete Real Runtime

1. Implement real Gateway HTTP client in OpenClawAdapter
2. Add device signature generation
3. Implement real event streaming
4. Add gateway health check
5. Handle authentication errors
6. Add connection retry logic
