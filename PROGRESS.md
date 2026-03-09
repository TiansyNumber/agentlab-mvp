# AgentLab MVP - Current Progress

**Last Updated**: 2026-03-09

## 🌐 Deployment Status

### Frontend
- **URL**: https://eb049adc.agentlab-frontend.pages.dev
- **Platform**: Cloudflare Pages
- **Status**: ✅ Online

### Backend
- **URL**: https://agentlab-backend.supertiansy.workers.dev
- **Platform**: Cloudflare Workers
- **Status**: ✅ Online

## ✅ What's Actually Working

### 1. Frontend UI (Local Development)
- ✅ Experiment creation form (draft experiments)
- ✅ Experiment list view
- ✅ Experiment detail view with event timeline
- ✅ Runtime Manager UI (register/list/select runtimes)
- ✅ Settings page (API keys)
- ✅ OpenClaw debug panel

### 2. Backend API (Deployed)
- ✅ `POST /api/runtimes` - Register runtime
- ✅ `GET /api/runtimes?owner=X` - List runtimes by owner
- ✅ `POST /api/experiments/start` - Start experiment
- ✅ `POST /api/experiments/:id/stop` - Stop experiment
- ✅ `GET /api/experiments/:id/events` - Get experiment events

### 3. Frontend-Backend Integration
- ✅ API client (`src/services/api.ts`) connects to backend
- ✅ RuntimeManager can register/list runtimes via backend
- ✅ ExperimentDetail has "后端启动" button
- ✅ Frontend polls backend for experiment events (3s interval)

## ⚠️ What's Still Stubbed

### Backend Layer
- ⚠️ **In-memory storage** - All data resets on redeploy (no D1/KV yet)
- ⚠️ **OpenClaw Adapter** - Emits stub events, no real WebSocket connection
- ⚠️ **Runtime endpoint** - Runtime registration doesn't validate real endpoints
- ⚠️ **Authentication** - No auth/authorization yet

### Frontend Layer
- ⚠️ **Runtime selection persistence** - Selected runtime not saved across page refresh
- ⚠️ **Experiment status sync** - Backend experiment status not synced back to frontend
- ⚠️ **Error handling** - Basic error alerts, no retry logic

## 🎯 Current Demo Loop Status

### Runtime Loop (Partial)
1. ✅ User opens RuntimeManager
2. ✅ User registers new runtime (owner + type)
3. ✅ User sees runtime list
4. ✅ User selects runtime
5. ⚠️ Selection not persisted or clearly shown in main UI

### Experiment Loop (Partial)
1. ✅ User creates draft experiment
2. ✅ User clicks "后端启动" button
3. ✅ Backend receives start request
4. ⚠️ Backend emits stub events (not real execution)
5. ✅ Frontend polls and displays events
6. ⚠️ Experiment completion not properly handled

## 🚧 Next Development Priority

### Immediate (This Session)
1. **Show selected runtime in main UI** - Display which runtime is selected
2. **Complete experiment event flow** - Ensure stub events show full lifecycle
3. **Add experiment completion handling** - Stop polling when experiment ends
4. **Update INTEGRATION_STATUS.md** - Reflect current accurate state

### Short-term (Next Session)
1. **Add persistent storage** - D1 or KV for backend data
2. **Improve OpenClaw adapter** - Real WebSocket connection attempt
3. **Better error handling** - Retry logic, connection status indicators

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
- `backend/src/adapters/openclaw.ts` - OpenClaw stub adapter

## 🔍 How to Verify Current State

### Test Backend API
```bash
# List runtimes
curl https://agentlab-backend.supertiansy.workers.dev/api/runtimes

# Register runtime
curl -X POST https://agentlab-backend.supertiansy.workers.dev/api/runtimes \
  -H "Content-Type: application/json" \
  -d '{"owner":"test","type":"openclaw","capabilities":["web"]}'
```

### Test Frontend
1. Open https://eb049adc.agentlab-frontend.pages.dev
2. Click "Runtime 管理" button
3. Register a runtime
4. Create a draft experiment
5. Click "后端启动" button
6. Watch events appear in timeline

## 📝 Honest Status Summary

**What we have**: A working frontend-backend connection with basic runtime registration and experiment start flow. Backend emits stub events that frontend can display.

**What we don't have**: Real OpenClaw execution, persistent storage, proper experiment lifecycle management, authentication.

**What's next**: Complete the demo loop so users can see a full runtime → experiment → events → completion flow, even if it's stubbed.
