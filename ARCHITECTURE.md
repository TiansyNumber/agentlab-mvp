# AgentLab 架构说明

## 核心定位

AgentLab 是一个 **Agent 实验管理平台**，负责：
- 实验定义（任务、成功标准、资源限制）
- 实验观察（事件时间线、状态追踪）
- 人工介入（暂停、恢复、标记成功/失败）
- 技能化（将成功实验转化为可复用技能）

**AgentLab 不是 Agent 执行引擎**，而是实验的编排和观察层。

---

## Runtime 架构

### 设计原则

AgentLab 通过 **Runner 接口** 对接不同的 Agent 执行运行时：

```
┌─────────────────────────────────────────┐
│         AgentLab Frontend               │
│  (实验定义 + 观察 + 人工介入 + 技能化)    │
└─────────────────┬───────────────────────┘
                  │ IExperimentRunner
        ┌─────────┼─────────┬─────────────┐
        │         │         │             │
   MockRunner  AnthropicRunner  [Future: OpenClaw Runtime]
   (开发/演示)  (直连 API)      (产品级集成)
```

### Runner 类型

#### 1. MockRunner（开发/演示）
- **用途**：开发、演示、UI 测试
- **实现**：模拟事件流，无真实 Agent 调用
- **状态**：✅ 可用

#### 2. AnthropicRunner（直连模型）
- **用途**：直接调用 Anthropic Claude API
- **实现**：浏览器中通过 `@anthropic-ai/sdk` 调用
- **限制**：API Key 存储在浏览器 localStorage，仅适合个人使用
- **状态**：✅ 可用

#### 3. OpenClaw Runtime Integration（产品级方案）
- **用途**：多人、多实验、多运行体的生产环境
- **架构**：AgentLab 后端 → OpenClaw Runtime API
- **状态**：❌ 未实现

---

## 验证工具 vs 产品方案

### OpenClawBrowserBridge（验证工具）

**这不是产品级方案，仅用于协议验证。**

- **实现方式**：浏览器直连本地 OpenClaw Gateway WebSocket
- **限制**：
  - 使用伪签名（浏览器无法生成真实设备签名）
  - 仅支持单机 localhost 访问
  - 无法支持多用户、多实验并发
  - 无法集成到生产环境
- **用途**：
  - 快速验证 OpenClaw Gateway 协议对齐
  - 本地开发调试
  - 协议逆向工程验证

**代码位置**：`src/services/runners/OpenClawBrowserBridge.ts`

### OpenClaw Runtime Integration（产品方案）

**这是未来的正式集成方向。**

#### 架构设计

```
┌──────────────────┐
│  AgentLab Web    │
│   (Browser)      │
└────────┬─────────┘
         │ HTTPS
         ↓
┌──────────────────┐
│ AgentLab Backend │  ← 需要实现
│  (Node.js/Go)    │
└────────┬─────────┘
         │ OpenClaw Runtime API
         ↓
┌──────────────────┐
│ OpenClaw Runtime │
│   (多实例支持)    │
└──────────────────┘
```

#### 为什么需要后端层？

1. **安全性**：
   - 真实设备签名需要私钥，不能在浏览器中暴露
   - Gateway Token 不应存储在浏览器
   - 需要用户认证和权限控制

2. **多租户支持**：
   - 多用户共享 OpenClaw Runtime 资源
   - 实验隔离和资源配额管理
   - 审计日志和成本追踪

3. **可扩展性**：
   - 支持多个 OpenClaw Runtime 实例
   - 负载均衡和故障转移
   - 实验队列和调度

#### 需要实现的组件

1. **AgentLab Backend API**：
   - `POST /api/experiments/:id/start` - 启动实验
   - `POST /api/experiments/:id/pause` - 暂停实验
   - `GET /api/experiments/:id/events` - 获取事件流（SSE/WebSocket）
   - `POST /api/experiments/:id/stop` - 停止实验

2. **OpenClaw Runtime Adapter**：
   - 设备签名生成（使用真实私钥）
   - Gateway 连接管理
   - 事件流转换（OpenClaw → AgentLab）
   - 会话状态管理

3. **Frontend Runner**：
   - `OpenClawRuntimeRunner`（通过 Backend API 调用）
   - 替代当前的 `OpenClawBrowserBridge`

---

## 最短可行验证路径

**目标**：验证 OpenClaw Gateway 协议是否正确对齐。

### 步骤

1. 确保本地 OpenClaw Gateway 运行：
   ```bash
   openclaw health
   ```

2. 获取 Gateway Token：
   ```bash
   openclaw config get gateway.auth
   ```

3. 在 AgentLab 中：
   - 点击"设置"，填写 Gateway URL 和 Token
   - 点击"OpenClaw 调试"按钮
   - 运行测试消息

4. 验证结果：
   - ✅ WebSocket 连接成功
   - ✅ connect 握手成功
   - ✅ agent 请求/响应成功
   - ✅ 返回内容正确

### 当前状态

- ✅ 协议已对齐（connect.challenge → connect → agent）
- ✅ 帧格式正确（type: req/res/event）
- ✅ 设备签名流程已实现（伪签名）
- ✅ 调试面板可用

---

## 正式产品路径

**目标**：将 OpenClaw 作为 AgentLab 的一级 Runtime，支持生产环境使用。

### 里程碑

#### Phase 1: Backend API 基础
- [ ] 实现 AgentLab Backend（Node.js/Go）
- [ ] 用户认证和权限系统
- [ ] 实验 CRUD API
- [ ] 数据库持久化（替代 localStorage）

#### Phase 2: OpenClaw Runtime Adapter
- [ ] 真实设备签名生成
- [ ] Gateway 连接池管理
- [ ] 事件流转换和映射
- [ ] 错误处理和重试机制

#### Phase 3: Frontend Integration
- [ ] 实现 `OpenClawRuntimeRunner`
- [ ] 通过 Backend API 启动/控制实验
- [ ] 实时事件流（SSE/WebSocket）
- [ ] 移除 `OpenClawBrowserBridge`

#### Phase 4: 生产就绪
- [ ] 多 Runtime 实例支持
- [ ] 负载均衡和调度
- [ ] 监控和告警
- [ ] 成本追踪和配额管理

### 技术选型建议

- **Backend**: Node.js (TypeScript) 或 Go
- **Database**: PostgreSQL
- **Real-time**: Server-Sent Events (SSE) 或 WebSocket
- **Auth**: JWT + OAuth2
- **Deployment**: Docker + Kubernetes

---

## 当前代码结构

```
src/
├── services/
│   └── runners/
│       ├── types.ts                    # IExperimentRunner 接口
│       ├── MockRunner.ts               # ✅ 开发/演示用
│       ├── AnthropicRunner.ts          # ✅ 直连 Claude API
│       ├── OpenClawBrowserBridge.ts    # ⚠️ 验证工具（非产品方案）
│       └── RunnerFactory.ts            # Runner 工厂
```

### 未来应添加

```
src/
├── services/
│   └── runners/
│       └── OpenClawRuntimeRunner.ts    # 产品级 OpenClaw 集成
backend/
├── src/
│   ├── api/                            # REST API
│   ├── adapters/
│   │   └── openclaw.ts                 # OpenClaw Runtime Adapter
│   ├── auth/                           # 认证授权
│   └── db/                             # 数据库层
```

---

## 总结

| 方案 | 用途 | 状态 | 适用场景 |
|------|------|------|----------|
| MockRunner | 开发/演示 | ✅ 可用 | UI 测试、演示 |
| AnthropicRunner | 直连模型 | ✅ 可用 | 个人使用、快速验证 |
| OpenClawBrowserBridge | 协议验证 | ⚠️ 验证工具 | 本地开发、协议调试 |
| OpenClawRuntimeRunner | 产品集成 | ❌ 未实现 | 生产环境、多用户 |

**关键原则**：不要把验证工具当成产品方案，不要把浏览器直连当成最终架构。
