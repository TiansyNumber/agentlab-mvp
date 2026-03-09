# AgentLab MVP

实验管理系统，用于创建、观察、人工介入和技能化 Agent 实验。

## 功能

### 已实现
- ✅ 完整的实验创建表单（任务描述、成功标准、失败条件、模型、工具权限、最大步数、最大Token、最大时长）
- ✅ 实验状态机（draft、running、paused、success、failed）
- ✅ 人工介入控制（继续、暂停、停止、标记成功、标记失败）
- ✅ **Runner 执行层架构**（MockRunner / AnthropicRunner / OpenClawRunner，统一接口，RunnerFactory 选择）
- ✅ **MockRunner**（模拟事件流，真实资源限制检查）
- ✅ **AnthropicRunner**（直接调用 Anthropic SDK，真实可运行）
- ✅ **OpenClawRunner**（通过本地 OpenClaw Gateway WebSocket 接入，最小闭环已打通）
- ✅ **资源限制真实生效**（maxSteps、maxTokens、maxDuration 在执行中检查）
- ✅ **自动技能生成**（实验成功时自动生成技能草稿）
- ✅ localStorage 持久化（刷新页面数据不丢失）
- ✅ 事件时间线（记录实验过程中的所有事件）
- ✅ 状态可视化（不同状态显示不同颜色）
- ✅ 代码结构分层（UI层、数据层、服务层、执行层）
- ✅ Runner 类型选择（Mock / Anthropic / OpenClaw）
- ✅ API Key 配置界面（含 OpenClaw Gateway 配置）

### 限制/待增强
- ⚠️ **AnthropicRunner 当前限制**：
  - 仅支持基础对话模式（不支持工具调用）
  - 成功判断基于关键词匹配（successCriteria）
  - 暂停/恢复功能简化实现
  - 需要在浏览器中配置 Anthropic API Key
- ⚠️ **OpenClawRunner 当前限制**（见下方详细说明）
- ⚠️ **工具权限实际生效**（当前仅记录选择，未实际限制工具调用）
- ⚠️ **技能草稿导出/应用**（当前仅生成并保存在 localStorage，未实现导出为文件或应用到系统）

## 运行

```bash
npm install
npm run dev
```

## 构建

```bash
npm run build
```

## 项目结构

```
src/
├── App.tsx                    # 主应用组件，管理视图切换和状态
├── main.tsx                   # 入口文件
├── types.ts                   # TypeScript 类型定义
├── utils.ts                   # 工具函数（localStorage 持久化、技能生成）
├── services/
│   ├── experimentActions.ts   # 实验动作服务层（事件创建）
│   └── runners/               # 执行引擎层
│       ├── types.ts           # IExperimentRunner 接口定义
│       ├── MockRunner.ts      # Mock 执行器（模拟事件流+资源限制）
│       ├── AnthropicRunner.ts # Anthropic 执行器（直接调用 Claude API，真实可运行）
│       ├── OpenClawRunner.ts  # OpenClaw 执行器（通过本地 Gateway WebSocket 接入）
│       ├── RunnerFactory.ts   # Runner 工厂（根据类型创建实例）
│       └── index.ts           # 导出
└── components/
    ├── ExperimentList.tsx     # 实验列表组件
    ├── ExperimentForm.tsx     # 实验创建表单
    ├── ExperimentDetail.tsx   # 实验详情和控制面板
    ├── Settings.tsx           # 设置页面（API Key + Gateway 配置）
    └── SkillList.tsx          # 技能列表组件
```

## Runner 架构

### 接口定义
所有 Runner 实现 `IExperimentRunner` 接口：
- `start(experiment, onEvent)`: 启动实验，通过回调发送事件
- `pause()`: 暂停执行
- `resume()`: 恢复执行
- `stop()`: 停止执行
- `getStatus()`: 获取当前状态（步数、Token、时长）

### RunnerFactory
`createRunner(type: 'mock' | 'anthropic' | 'openclaw')` 根据类型返回对应实例。

---

### MockRunner（可用）
- 每 2 秒执行一步，自动生成 action 事件
- 真实检查资源限制：达到 maxSteps → 成功，超过 maxTokens/maxDuration → 失败
- 支持 pause/resume/stop 控制
- 模拟 Token 消耗（每步 50-150 tokens）
- **无需任何配置，开箱即用**

---

### AnthropicRunner（可用，真实运行）
直接调用 Anthropic SDK（`@anthropic-ai/sdk`）执行真实的 Claude 对话任务。

**已支持功能：**
- ✅ 真实 Claude API 调用（通过 @anthropic-ai/sdk）
- ✅ 多轮对话执行
- ✅ 资源限制检查（maxSteps、maxTokens、maxDuration）
- ✅ 实时事件流（started、action、success/failed）
- ✅ Token 使用统计
- ✅ 基于成功标准的自动判断

**使用方法：**
1. 点击右上角"设置"按钮
2. 输入你的 Anthropic API Key（格式：sk-ant-...）
3. 保存后返回实验列表
4. 在 Runner 下拉框中选择"Anthropic（直连 Claude API）"
5. 创建并启动实验

**当前限制：**
- 仅支持基础对话模式（不支持工具调用）
- 成功判断基于 successCriteria 关键词匹配
- 暂停/恢复为简化实现（停止当前请求，重新开始）
- API Key 存储在浏览器 localStorage（仅本地使用）

---

### OpenClawRunner（协议已对齐，需本地 Gateway）
通过本地 OpenClaw Gateway WebSocket 接口执行 Agent 任务。

**真实 Gateway 协议（逆向自 openclaw 安装包源码）：**

```
1. WS 连接建立后，Gateway 发送 connect.challenge 事件：
   { type: "event", event: "connect.challenge", payload: { nonce: "..." } }

2. 客户端发送 connect 请求（必须有 type: "req"）：
   { type: "req", id: "<uuid>", method: "connect", params: {
       minProtocol: 3, maxProtocol: 3,
       client: { id: "cli", version: "1.0.0", platform: "browser", mode: "cli" },
       auth: { token: "<gateway_token>" },
       role: "operator",
       scopes: ["operator.admin", "operator.read", "operator.write", ...],
       caps: []
   }}

3. Gateway 响应 hello-ok：
   { type: "res", id: "<same-uuid>", ok: true, payload: { type: "hello-ok", ... } }

4. 客户端发送 agent 请求（idempotencyKey 必填）：
   { type: "req", id: "<uuid>", method: "agent", params: {
       message: "...",
       idempotencyKey: "<uuid>"
   }}

5. Gateway 先响应 accepted，再响应 final：
   { type: "res", id: "<same-uuid>", ok: true, payload: { status: "accepted", runId: "..." } }
   { type: "res", id: "<same-uuid>", ok: true, payload: { status: "final", ... } }
```

**关键修正（本轮修复的根本原因）：**
- 旧实现发送 `{ id, method, params }` → Gateway 返回 `1008 invalid request frame`
- 新实现所有帧必须有 `type` 字段（`"req"` / `"res"` / `"event"`）
- connect 不在 `onopen` 直接发，而是等 `connect.challenge` 事件后才发
- agent 请求必须包含 `idempotencyKey`（NonEmptyString，必填）
- 响应帧格式是 `{ type: "res", id, ok, payload }`，不是旧的 `{ id, result }`

**已支持功能：**
- ✅ 正确的 connect.challenge → connect 握手流程
- ✅ 正确的 req/res/event 帧格式
- ✅ agent 请求（含 idempotencyKey）
- ✅ accepted / final 两阶段响应处理
- ✅ 调试面板分层错误输出（每步都有 `[调试]` 前缀事件）
- ✅ 资源限制检查（maxSteps、maxTokens、maxDuration）

**使用方法：**
1. 确保本地 OpenClaw Gateway 正在运行（`openclaw health` 验证）
2. 获取 Gateway Token：`openclaw config get gateway.auth`
3. 在 AgentLab 设置中填写 Gateway URL 和 Token
4. 在 Runner 下拉框中选择"OpenClaw（本地 Gateway）"
5. 创建并启动实验

**当前已知限制：**
- ⚠️ **需要本地 Gateway 运行**：Gateway 默认绑定 loopback，浏览器可直接访问
- ⚠️ **暂停/恢复为简化实现**：中断当前 WS 连接，恢复时重新开始新轮次
- ⚠️ **无流式事件**：等待 final 响应后才写入时间线
- ⚠️ **无工具调用事件映射**：agent 内部工具调用不在时间线中展示

## 技术栈

- React 18
- TypeScript
- Vite
- `@anthropic-ai/sdk`（AnthropicRunner 使用）
- localStorage（数据持久化）

## 数据存储

所有数据存储在浏览器 localStorage：
- `agentlab_experiments`: 实验数据
- `agentlab_skills`: 技能草稿数据
- `anthropic_api_key`: Anthropic API Key（用于 AnthropicRunner）
- `openclaw_gateway_url`: OpenClaw Gateway URL（用于 OpenClawRunner）
- `openclaw_gateway_token`: OpenClaw Gateway Token（用于 OpenClawRunner）

---

## 本地 OpenClaw 调试测试

### 入口
点击页面右上角 **"OpenClaw 调试"** 按钮，进入调试面板。无需创建实验表单。

### 默认配置
- Gateway URL：`ws://localhost:18889`
- Token：从 `openclaw config get gateway.auth` 获取，填入面板或在"设置"中保存

### 使用步骤
1. 确保本地 OpenClaw Gateway 正在运行（`openclaw health` 验证）
2. 获取 Token：`openclaw config get gateway.auth`
3. 打开 AgentLab，点击右上角 **"OpenClaw 调试"**
4. 填写 Gateway URL（默认已填）和 Token
5. 可修改测试消息（默认：`你好，请回复一句话确认连接正常。`）
6. 点击 **"运行测试"**

### 面板能验证什么
| 验证项 | 说明 |
|--------|------|
| ✅ WebSocket 连接 | 能否连上 `ws://localhost:18889` |
| ✅ connect 握手 | token 是否被 Gateway 接受 |
| ✅ agent 消息发送 | OpenClawRunner 主路径是否正常走通 |
| ✅ 响应内容 | 返回的 timeline 事件和文本内容 |
| ✅ 失败原因分类 | 连接失败 / token 错误 / 超时 / 空响应 |

### 面板不能验证什么
- OpenClaw 内部 agent 逻辑是否正确（取决于 Gateway 实现）
- 工具调用是否生效（当前 Runner 不支持工具调用事件映射）
- 流式事件（当前等待完整响应后才写入时间线）

---

## 下一步建议

1. **增强 AnthropicRunner**
   - 支持工具调用（Bash、Read、Write 等）
   - 支持流式响应和更细粒度的事件

2. **完善 OpenClawRunner**
   - 确认并对齐 Gateway WS 协议规范
   - 支持流式事件
   - 支持工具调用事件映射

3. **实现工具权限控制**
   - 在 Runner 中根据 experiment.tools 限制可用工具

4. **技能导出和应用**
   - 实现技能草稿导出为 JSON/YAML 文件

5. **安全性改进**
   - 使用后端代理 API 调用，避免在浏览器中暴露 API Key
