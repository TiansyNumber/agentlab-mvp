# AgentLab MVP - Current Progress

**Last Updated**: 2026-03-10

## 🌐 Deployment Status

### Frontend
- **URL**: https://eb049adc.agentlab-frontend.pages.dev
- **Platform**: Cloudflare Pages
- **Status**: ✅ Online

### Backend
- **URL**: https://agentlab-backend.supertiansy.workers.dev
- **Platform**: Cloudflare Workers
- **Status**: ✅ Online

### CLI Connector
- **Location**: `connector/` directory
- **Status**: ✅ Working (local runtime registration + dispatch server)
- **Latest Commit**: b010bc2

## ✅ What's Actually Working

### 1. Real Runtime Dispatch Path (NEW)
- ✅ CLI Connector registers local runtime with dispatch server URL
- ✅ Connector runs HTTP dispatch server on port 18890
- ✅ Backend sends POST /experiments to dispatch server (not mock fallback)
- ✅ Dispatch server receives experiment, emits experiment_completed event
- ✅ Backend polls dispatch server for events and returns to frontend
- ✅ Frontend displays real events with source: "real"
- ✅ experiment_failed events also terminate polling

### 2. CLI Connector V0
- ✅ Auto-register local runtime to AgentLab backend
- ✅ Device ID management (~/.agentlab/connector.json)
- ✅ Heartbeat mechanism (30s interval)
- ✅ HTTP dispatch server receives experiments from backend
- ✅ Command: `cd connector && npm start`

### 3. Frontend UI
- ✅ Experiment creation form (draft experiments)
- ✅ Experiment list view
- ✅ Experiment detail view with event timeline
- ✅ Runtime Manager UI (register/list/select runtimes)
- ✅ Settings page (API keys)
- ✅ OpenClaw debug panel

### 4. Backend API (Deployed)
- ✅ `POST /api/runtimes` - Register runtime
- ✅ `GET /api/runtimes?owner=X` - List runtimes by owner
- ✅ `POST /api/experiments/start` - Start experiment (real dispatch path)
- ✅ `POST /api/experiments/:id/stop` - Stop experiment
- ✅ `GET /api/experiments/:id/events` - Get experiment events

### 5. Frontend-Backend Integration
- ✅ API client (`src/services/api.ts`) connects to backend
- ✅ RuntimeManager can register/list runtimes via backend
- ✅ ExperimentDetail has "后端启动" button
- ✅ Frontend polls backend for experiment events (3s interval)
- ✅ Polling terminates on experiment_completed or experiment_failed

## ⚠️ What's Still Limited

### Real Runtime Path
- ⚠️ **Dispatch server is minimal** - Only emits experiment_completed, no real OpenClaw execution yet
- ⚠️ **No actual agent execution** - Dispatch server returns success immediately without running agent
- ⚠️ **No tool calls** - Events don't include agent actions/tool calls yet
- ⚠️ **Single experiment at a time** - Dispatch server doesn't handle concurrent experiments well

### Backend Layer
- ⚠️ **In-memory storage** - All data resets on redeploy (no D1/KV yet)
- ⚠️ **Authentication** - No auth/authorization yet
- ⚠️ **Runtime health checks** - No validation of runtime availability

### Frontend Layer
- ⚠️ **Runtime selection persistence** - Selected runtime not saved across page refresh
- ⚠️ **Error handling** - Basic error alerts, no retry logic

## 🎯 Current Demo Loop Status

### CLI Connector + Real Runtime Loop (Working)
1. ✅ User runs `cd connector && npm start`
2. ✅ Connector registers runtime with dispatch server URL (http://localhost:18890)
3. ✅ Connector starts HTTP dispatch server on port 18890
4. ✅ Backend receives runtime registration with gateway_url pointing to dispatch server
5. ✅ User creates experiment in frontend
6. ✅ User clicks "后端启动" button
7. ✅ Backend sends POST /experiments to dispatch server (not mock fallback)
8. ✅ Dispatch server receives experiment, emits experiment_completed event
9. ✅ Frontend polls backend, backend polls dispatch server, events flow back
10. ⚠️ Dispatch server returns success immediately (no real agent execution yet)

## 🚧 Next Development Priority

### Immediate Next Steps
1. **Connect dispatch server to real OpenClaw Gateway** - Make dispatch server actually execute agent tasks
2. **Add agent action events** - Emit tool calls and agent thinking events
3. **Handle concurrent experiments** - Support multiple experiments in dispatch server

### Short-term
1. **Add persistent storage** - D1 or KV for backend data
2. **Better error handling** - Retry logic, connection status indicators
3. **Runtime health checks** - Validate runtime availability before dispatch

## 📁 Key Files

### Frontend
- `src/App.tsx` - Main app, runtime state, backend integration
- `src/components/RuntimeManager.tsx` - Runtime UI
- `src/components/ExperimentDetail.tsx` - Experiment UI with backend button
- `src/services/api.ts` - Backend API client

### Backend
- `backend/src/worker.ts` - Cloudflare Workers entry point
- `backend/src/api/runtime-registry.ts` - Runtime CRUD
- `backend/src/api/experiment-control.ts` - Experiment CRUD
- `backend/src/services/experiment-manager.ts` - Runtime adapter connection
- `backend/src/adapters/openclaw.ts` - OpenClaw adapter (real dispatch path)

### CLI Connector
- `connector/src/connector.ts` - Core connector + dispatch server
- `connector/src/cli.ts` - CLI entry point
- `connector/dist/cli.js` - Built output

## 🔍 How to Verify Current State

### Test CLI Connector
```bash
cd connector && npm run build && npm start
# Should output: runtime_id, heartbeat running, dispatch server on :18890
```

### Test Backend API
```bash
# List runtimes
curl https://agentlab-backend.supertiansy.workers.dev/api/runtimes

# Register runtime (manual)
curl -X POST https://agentlab-backend.supertiansy.workers.dev/api/runtimes \
  -H "Content-Type: application/json" \
  -d '{"owner":"test","runtime_type":"openclaw","runtime_mode":"real","gateway_url":"http://localhost:18890"}'
```

### Test Frontend
1. Open https://eb049adc.agentlab-frontend.pages.dev
2. Click "Runtime 管理" button
3. Register a runtime (or use CLI connector)
4. Create a draft experiment
5. Click "后端启动" button
6. Watch events appear in timeline

## 📝 Honest Status Summary

**What's truly working**: Real dispatch path is wired up. CLI Connector registers local runtime, starts dispatch server on :18890, backend sends experiments to dispatch server instead of mock fallback. Events flow back through backend to frontend.

**What's still a stub**: Dispatch server returns experiment_completed immediately without running any real agent. No actual OpenClaw execution happens yet.

**What's next**: Wire dispatch server to real OpenClaw Gateway WebSocket to execute actual agent tasks.
