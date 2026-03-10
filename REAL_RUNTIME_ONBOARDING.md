# AgentLab Real Runtime Onboarding (CLI Connector)

把本地 OpenClaw 接入 AgentLab，跑真实 experiment。

---

## 前提

- Node.js 18+
- 本地已有 OpenClaw（或任意 agent runtime）在运行
- AgentLab backend 已启动（本地或线上）

---

## Step 1: 启动 Backend（本地）

```bash
cd backend
npx wrangler dev
# 看到 "Ready on http://localhost:8787" 即可
```

如果用线上 backend，跳过此步，直接用：
```
https://agentlab-backend.supertiansy.workers.dev
```

---

## Step 2: 启动本地 OpenClaw

按你的 OpenClaw 文档启动，默认监听 `http://localhost:18889`。

验证是否在跑：
```bash
curl http://localhost:18889/health
# 返回任意 200 即可（404 也没关系，connector 会跳过健康检查）
```

---

## Step 3: 运行 Connector

```bash
cd connector
npm run build

# 连接本地 backend + 本地 OpenClaw
node dist/cli.js start

# 或连接线上 backend
node dist/cli.js start --backend https://agentlab-backend.supertiansy.workers.dev
```

可选参数：
```
--backend <url>   Backend URL（默认 http://localhost:8787）
--gateway <url>   OpenClaw Gateway URL（默认 http://localhost:18889）
--name <name>     Runtime 显示名称（默认 Local OpenClaw）
```

---

## Step 4: 确认成功

看到以下输出即为成功：

```
🚀 AgentLab Connector V0
Backend: http://localhost:8787
Gateway: http://localhost:18889
Name: Local OpenClaw

Checking backend reachability...
✅ Backend is reachable

Registering runtime...
✅ Runtime registered: 97a8775c-5d25-455f-88f3-572cd96f65ae
Status: online
Device ID: <your-device-id>

Starting heartbeat (30s interval)...
✅ Connector running. Press Ctrl+C to stop.
```

关键：`Runtime registered` 后面的 UUID 就是你的 `runtime_id`，记下来。

---

## Step 5: 在 AgentLab 中选择 Runtime 跑 Experiment

1. 打开 AgentLab UI（本地 `npm run dev` 或线上）
2. 点击右上角 **Runtime 管理**
3. 点击 **刷新列表**，找到 `🟢 real (CLI)` 那行（绿色背景）
4. 点击 **选择**，右上角会显示 `🟢 Real Runtime: <id前8位>`
5. 返回实验列表，选择一个实验，点击 **后端启动**
6. 观察事件时间线，看到 `connected` → `task_submitted` → `experiment_completed` 即成功

---

## 常见问题

**Backend not reachable**
→ 确认 `cd backend && npx wrangler dev` 已启动，或改用线上 backend URL

**Registration failed (HTTP 400)**
→ 检查 `device_id` 和 `gateway_url` 是否有效，connector 会自动生成 device_id

**Heartbeat failing**
→ connector 会自动重试并打印警告，不影响已注册的 runtime；backend 重启后需重新运行 connector

**Runtime 列表里看不到**
→ 点刷新；注意 backend 是内存存储，重启后 runtime 会消失，需重新运行 connector

---

## device_id 持久化

Connector 会把 device_id 保存在 `~/.agentlab/connector.json`，下次启动自动复用，无需手动管理。
