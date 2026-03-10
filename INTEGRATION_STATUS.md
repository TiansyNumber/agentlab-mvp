# Frontend-Backend Integration Status

## Latest Update (2026-03-10)

### Deployment Status ✅
- **Backend**: https://agentlab-backend.supertiansy.workers.dev
- **Frontend**: https://eb049adc.agentlab-frontend.pages.dev
- **CLI Connector**: Local tool (connector/ directory)
- Both successfully deployed and built

### Real Runtime Dispatch Path ✅ (NEW)
- CLI Connector registers local runtime with dispatch server URL
- Connector runs HTTP dispatch server on port 18890
- Backend sends POST /experiments to dispatch server (real path, not mock fallback)
- Dispatch server receives experiment and emits events
- Backend polls dispatch server for events
- Frontend displays events with source: "real"
- experiment_failed events also terminate polling

### 1. Frontend-Backend Connection ✅
- Created `src/services/api.ts` - API client connecting to backend
- Frontend now points to: `https://agentlab-backend.supertiansy.workers.dev`
- API methods: registerRuntime, listRuntimes, startExperiment, stopExperiment, getExperimentEvents

### 2. Runtime Management UI ✅
- Created `src/components/RuntimeManager.tsx`
- Features:
  - Register new OpenClaw runtimes
  - List all runtimes by owner
  - Select runtime for experiments
- Accessible via "Runtime 管理" button in main UI
- Selected runtime ID shown in main UI header

### 3. Backend Experiment Flow ✅
- Added `handleStartWithBackend()` in App.tsx
- Connects experiments to backend via selected runtime
- Polls backend for experiment events every 3 seconds
- Stops polling when experiment completes
- "后端启动" button in ExperimentDetail for draft experiments

### 4. OpenClaw Adapter Improvements ✅
- Emits complete stub event flow: connected → task_submitted → agent_thinking → agent_action (x2) → agent_response → experiment_completed
- Simulates realistic agent execution with 2-second intervals
- Auto-completes after 4 steps

## Current Architecture

```
Frontend (Cloudflare Pages)
    ↓ HTTPS
Backend API (Cloudflare Workers)
    ↓ HTTP POST /experiments
CLI Connector Dispatch Server (:18890)
    ↓ (not yet connected)
OpenClaw Gateway (:18889)
```

## What Works Now

1. **CLI Connector Registration**: Connector auto-registers local runtime with dispatch server URL
2. **Dispatch Server**: HTTP server on :18890 receives experiments from backend
3. **Real Dispatch Path**: Backend sends experiments to dispatch server (no mock fallback for real runtimes)
4. **Event Flow**: Dispatch server → Backend → Frontend
5. **Polling Termination**: Both experiment_completed and experiment_failed stop polling

## What's Still Limited

1. **Dispatch Server Execution**: Returns experiment_completed immediately without running real agent
2. **No OpenClaw Connection**: Dispatch server doesn't connect to OpenClaw Gateway yet
3. **No Agent Actions**: Events don't include tool calls or agent thinking
4. **Persistent Storage**: Backend uses in-memory storage (resets on redeploy)
5. **Concurrent Experiments**: Dispatch server handles one experiment at a time

## Next Steps

1. **Connect dispatch server to OpenClaw Gateway** - Make dispatch server execute real agent tasks
2. **Add agent action events** - Emit tool calls and thinking events
3. **Handle concurrent experiments** - Support multiple experiments
4. **Add persistent storage** - D1 or KV for backend

## Recent Commits

- `b010bc2` - feat: replace mock fallback with real dispatch path via connector dispatch server
- `bcb4dc5` - feat: P1+P2+P3 - real runtime productization, connector stability, onboarding SOP
- `c80c715` - fix: change CLI default backend to localhost:8787 due to Cloudflare Workers network timeout
