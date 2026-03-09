# Runtime Integration Status

## Three-Tier Runtime Mode System

AgentLab now supports three distinct runtime modes to clearly separate demo, simulation, and real OpenClaw integration:

### 1. Demo Mode (`runtime_mode: 'demo'`)
- **Purpose**: Pure demonstration, no real functionality
- **Requirements**: None
- **Auth**: None
- **Use case**: UI testing, feature demos

### 2. Simulated Mode (`runtime_mode: 'simulated'`)
- **Purpose**: Simulates OpenClaw behavior without real Gateway connection
- **Requirements**: None
- **Auth**: None
- **Use case**: Development, testing experiment flow

### 3. Real Mode (`runtime_mode: 'real'`)
- **Purpose**: Real OpenClaw Gateway connection
- **Requirements**:
  - `device_id` (required)
  - `gateway_url` (required)
  - `private_key` (backend only, not exposed to browser)
- **Auth**: device_signature
- **Use case**: Production experiments with real OpenClaw runtime

## Backend Changes

### Runtime Model (`backend/src/models/runtime.ts`)
- Added `runtime_mode: RuntimeMode` field
- Added optional `device_id?: string` field
- Added optional `gateway_url?: string` field
- Type: `RuntimeMode = 'demo' | 'simulated' | 'real'`

### Runtime Registry (`backend/src/api/runtime-registry.ts`)
- Validates `device_id` and `gateway_url` when `runtime_mode === 'real'`
- Sets `auth_mode` to `'device_signature'` for real mode
- Stores real runtime configuration fields

### OpenClaw Adapter (`backend/src/adapters/openclaw.ts`)
- Constructor validates real mode requirements
- `connect()` throws error for real mode (not yet implemented)
- Emits mode information in connection events

### Worker API (`backend/src/worker.ts`)
- Returns `mode`, `device_id`, `gateway_url` in runtime list response

## Frontend Changes

### API Types (`src/services/api.ts`)
- Added `mode: 'demo' | 'simulated' | 'real'` to Runtime interface
- Added optional `device_id?: string` field
- Added optional `gateway_url?: string` field
- Updated `registerRuntime()` signature

### Runtime Manager UI (`src/components/RuntimeManager.tsx`)
- Mode selector dropdown (Demo/Simulated/Real)
- Conditional fields for real mode:
  - Device ID input
  - Gateway URL input
- Validation: real mode requires both fields
- Runtime list table shows mode column

## Current Status

### ✅ Completed
- Three-tier mode distinction in data model
- Backend validation for real runtime requirements
- Frontend UI for mode selection and real runtime fields
- API endpoints support all three modes
- Adapter mode handling structure

### ⚠️ Not Yet Implemented
- Real OpenClaw Gateway connection logic
- Device signature generation
- Private key management
- Real Gateway API communication
- WebSocket/SSE for real runtime events

### 🔒 Security Notes
- `private_key` is NEVER sent to frontend
- `private_key` is stored backend-only (not in current in-memory store)
- Real mode requires proper key management before production use

## Testing Real Runtime Registration

1. Open frontend: https://ba60ed5a.agentlab-frontend.pages.dev
2. Navigate to Runtime Manager
3. Select "Real (真实 OpenClaw Gateway)" mode
4. Enter:
   - Device ID: `device-test-001`
   - Gateway URL: `https://gateway.openclaw.ai`
5. Click "注册 Runtime"
6. Backend will accept and store the configuration
7. Attempting to start experiment with real runtime will fail with: "Real OpenClaw Gateway connection not yet implemented"

## Next Steps for Real Integration

1. Implement device signature generation in backend
2. Add private key storage (KV/D1/Secrets)
3. Implement real Gateway HTTP/WebSocket client
4. Add Gateway authentication flow
5. Handle real experiment events from Gateway
6. Add error handling for Gateway failures
7. Add runtime health checks
