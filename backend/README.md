# AgentLab Backend

## Overview

AgentLab V2 platform layer - separates experiment orchestration from runtime execution.

## Structure

```
backend/
├── src/
│   ├── models/          # Data models
│   │   ├── runtime.ts   # Runtime registry model
│   │   └── experiment.ts # Experiment model
│   ├── api/             # Cloudflare-ready API logic
│   │   ├── runtime-registry.ts
│   │   └── experiment-control.ts
│   ├── adapters/        # Runtime adapters (NOT Cloudflare-ready)
│   │   └── openclaw.ts  # OpenClaw Gateway adapter
│   └── worker.ts        # Cloudflare Workers entry point
```

## API Endpoints

### Runtime Registry
- `POST /api/runtimes` - Register runtime
- `POST /api/runtimes/heartbeat` - Update heartbeat
- `GET /api/runtimes?owner=<owner>` - List runtimes

### Experiment Control
- `POST /api/experiments/start` - Start experiment
- `POST /api/experiments/:id/stop` - Stop experiment
- `GET /api/experiments/:id/events` - Get event timeline

## Deployment

See `CLOUDFLARE_ARCHITECTURE.md` for deployment strategy.
