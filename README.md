# AgentLab MVP

实验管理系统，用于创建、观察、人工介入和技能化 Agent 实验。

## 功能

### 已实现
- ✅ 完整的实验创建表单（任务描述、成功标准、失败条件、模型、工具权限、最大步数、最大Token、最大时长）
- ✅ 实验状态机（draft、running、paused、success、failed）
- ✅ 人工介入控制（继续、暂停、停止、标记成功、标记失败）
- ✅ **Runner 执行层架构**（可替换的执行引擎接口）
- ✅ **MockRunner 真实事件流**（自动驱动实验执行，生成事件）
- ✅ **资源限制真实生效**（maxSteps、maxTokens、maxDuration 在执行中检查）
- ✅ **自动技能生成**（实验成功时自动生成技能草稿）
- ✅ localStorage 持久化（刷新页面数据不丢失）
- ✅ 事件时间线（记录实验过程中的所有事件）
- ✅ 状态可视化（不同状态显示不同颜色）
- ✅ 代码结构分层（UI层、数据层、服务层、执行层）

### Stub/待实现
- ⚠️ **OpenClawRunner**（已预留接口，但未实现真实集成）
  - 入口：`src/services/runners/OpenClawRunner.ts`
  - 需要接入 OpenClaw runtime SDK
  - 需要配置：agent_id、model、tools、budget、event callback
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
│       ├── types.ts           # Runner 接口定义
│       ├── MockRunner.ts      # Mock 执行器（真实事件流+资源限制）
│       ├── OpenClawRunner.ts  # OpenClaw 执行器（STUB）
│       └── index.ts           # 导出
└── components/
    ├── ExperimentList.tsx     # 实验列表组件
    ├── ExperimentForm.tsx     # 实验创建表单
    ├── ExperimentDetail.tsx   # 实验详情和控制面板
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

### MockRunner（已实现）
- 每 2 秒执行一步，自动生成 action 事件
- 真实检查资源限制：
  - 达到 maxSteps → 自动成功
  - 超过 maxTokens → 自动失败
  - 超过 maxDuration → 自动失败
- 支持 pause/resume/stop 控制
- 模拟 Token 消耗（每步 50-150 tokens）

### OpenClawRunner（STUB）
当前为占位实现，抛出 "not implemented" 错误。

**接入 OpenClaw 需要：**
1. 安装 OpenClaw SDK/client
2. 在 `start()` 中初始化 runtime，传入：
   - `agent_id`: experiment.id
   - `model`: experiment.model
   - `tools`: experiment.tools
   - `max_steps`: experiment.maxSteps
   - `max_tokens`: experiment.maxTokens
   - `timeout`: experiment.maxDuration
3. 实现事件桥接：将 OpenClaw 事件映射到 AgentLab Event 类型
4. 实现 pause/resume/stop 对应的 OpenClaw API 调用

## 技术栈

- React 18
- TypeScript
- Vite
- localStorage（数据持久化）

## 数据存储

所有数据存储在浏览器 localStorage：
- `agentlab_experiments`: 实验数据
- `agentlab_skills`: 技能草稿数据

## 下一步建议

1. **接入 OpenClaw Runtime**
   - 在 `src/services/runners/OpenClawRunner.ts` 中实现真实逻辑
   - 集成 OpenClaw SDK
   - 实现事件桥接和状态同步

2. **实现工具权限控制**
   - 在 Runner 中根据 experiment.tools 限制可用工具
   - 拦截未授权的工具调用

3. **技能导出和应用**
   - 实现技能草稿导出为 JSON/YAML 文件
   - 支持将技能应用到 Agent 系统（如 Kiro 的 skills）

4. **增强事件时间线**
   - 记录更详细的 Agent 执行过程（工具调用、思考过程、错误信息）
   - 支持事件过滤和搜索

5. **后端持久化**（可选）
   - 替换 localStorage 为真实数据库
   - 支持多用户和团队协作

