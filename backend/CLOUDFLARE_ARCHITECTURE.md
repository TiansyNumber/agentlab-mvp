# AgentLab V2 Cloudflare Architecture

## Cloudflare-Ready vs Non-Cloudflare Components

### ✅ Cloudflare-Ready (Can run on Cloudflare Workers/Pages)

**AgentLab Backend API Layer** (`backend/src/api/`, `backend/src/worker.ts`)
- Runtime registry endpoints
- Experiment control endpoints
- HTTP request/response handling
- Stateless API logic

**Storage**: Use Cloudflare D1 (SQLite) or KV for persistence

**Deployment**: Cloudflare Workers

---

### ❌ NOT Cloudflare-Ready (Requires separate infrastructure)

**OpenClaw Runtime Execution** (`backend/src/adapters/openclaw.ts`)
- Device signature generation (requires private keys)
- Long-lived WebSocket connections to OpenClaw Gateway
- Stateful session management
- Real-time event streaming

**Why NOT Cloudflare?**
- Cloudflare Workers have 30s CPU time limit
- OpenClaw experiments can run for minutes/hours
- WebSocket connections need persistent state
- Device private keys should not be in Workers

**Deployment**: Separate Node.js/Go service (Docker/K8s)

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────┐
│  AgentLab Frontend (Cloudflare Pages)               │
└────────────────────┬────────────────────────────────┘
                     │ HTTPS
                     ↓
┌─────────────────────────────────────────────────────┐
│  AgentLab Backend API (Cloudflare Workers)          │
│  - Runtime registry                                  │
│  - Experiment CRUD                                   │
│  - Event timeline queries                            │
└────────────────────┬────────────────────────────────┘
                     │ HTTP/gRPC
                     ↓
┌─────────────────────────────────────────────────────┐
│  OpenClaw Runtime Adapter (Node.js/Go Service)      │
│  - Device signature generation                       │
│  - Gateway WebSocket management                      │
│  - Event stream processing                           │
└────────────────────┬────────────────────────────────┘
                     │ WebSocket
                     ↓
┌─────────────────────────────────────────────────────┐
│  OpenClaw Gateway (External)                        │
└─────────────────────────────────────────────────────┘
```

---

## Data Flow

### Starting an Experiment

1. Frontend → Backend API: `POST /api/experiments/start`
2. Backend API → OpenClaw Adapter: HTTP request to adapter service
3. OpenClaw Adapter → Gateway: WebSocket connection + agent request
4. Gateway → OpenClaw Adapter: Event stream
5. OpenClaw Adapter → Backend API: Store events in D1/KV
6. Frontend → Backend API: Poll `GET /api/experiments/:id/events`

---

## Deployment Strategy

### Phase 1: Cloudflare Backend API
- Deploy `backend/src/worker.ts` to Cloudflare Workers
- Use D1 for runtime/experiment persistence
- Mock OpenClaw adapter responses

### Phase 2: OpenClaw Adapter Service
- Deploy `backend/src/adapters/openclaw.ts` as separate Node.js service
- Backend API calls adapter via HTTP/gRPC
- Adapter manages Gateway connections

### Phase 3: Production
- Multi-region adapter deployment
- Load balancing across OpenClaw instances
- Event streaming via SSE/WebSocket from Backend API
