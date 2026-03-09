# AgentLab MVP

实验管理系统，用于创建、观察、人工介入和技能化 Agent 实验。

## 功能

### 已实现
- ✅ 完整的实验创建表单（任务描述、成功标准、失败条件、模型、工具权限、最大步数、最大Token、最大时长）
- ✅ 实验状态机（draft、running、paused、success、failed）
- ✅ 人工介入控制（继续、暂停、停止、标记成功、标记失败）
- ✅ **Runner 执行层架构**（可替换的执行引擎接口）
- ✅ **MockRunner 真实事件流**（自动驱动实验执行，生成事件）
- ✅ **OpenClawRunner 真实集成**（使用 Anthropic SDK 执行真实 Agent 任务）
- ✅ **资源限制真实生效**（maxSteps、maxTokens、maxDuration 在执行中检查）
- ✅ **自动技能生成**（实验成功时自动生成技能草稿）
- ✅ localStorage 持久化（刷新页面数据不丢失）
- ✅ 事件时间线（记录实验过程中的所有事件）
- ✅ 状态可视化（不同状态显示不同颜色）
- ✅ 代码结构分层（UI层、数据层、服务层、执行层）
- ✅ Runner 类型选择（Mock / OpenClaw）
- ✅ API Key 配置界面

### 限制/待增强
- ⚠️ **OpenClawRunner 当前限制**：
  - 仅支持基础对话模式（不支持工具调用）
  - 成功判断基于关键词匹配（successCriteria）
  - 暂停/恢复功能简化实现
  - 需要在浏览器中配置 Anthropic API Key
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
│       ├── OpenClawRunner.ts  # OpenClaw 执行器（真实 Claude API 集成）
│       └── index.ts           # 导出
└── components/
    ├── ExperimentList.tsx     # 实验列表组件
    ├── ExperimentForm.tsx     # 实验创建表单
    ├── ExperimentDetail.tsx   # 实验详情和控制面板
    ├── Settings.tsx           # 设置页面（API Key 配置）
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

### OpenClawRunner（已实现）
使用 Anthropic SDK 执行真实的 Claude Agent 任务。

**已支持功能：**
- ✅ 真实 Claude API 调用（通过 @anthropic-ai/sdk）
- ✅ 多轮对话执行
- ✅ 资源限制检查（maxSteps、maxTokens、maxDuration）
- ✅ 实时事件流（started、action、success/failed）
- ✅ Token 使用统计
- ✅ 基于成功标准的自动判断
- ✅ 暂停/恢复/停止控制

**使用方法：**
1. 点击右上角"设置"按钮
2. 输入你的 Anthropic API Key（格式：sk-ant-...）
3. 保存后返回实验列表
4. 在 Runner 下拉框中选择"OpenClaw"
5. 创建并启动实验

**当前限制：**
- 仅支持基础对话模式（不支持工具调用）
- 成功判断基于 successCriteria 关键词匹配
- 暂停/恢复为简化实现（停止当前请求，重新开始）
- API Key 存储在浏览器 localStorage（仅本地使用）

**事件时间线示例：**
- `start`: 实验开始
- `action`: 步骤 1: 调用 claude-3-5-sonnet-20241022...
- `action`: 步骤 1: [Claude 的响应内容]...
- `action`: 步骤 2: 调用 claude-3-5-sonnet-20241022...
- `success`: 任务完成（或达到资源限制）

## 技术栈

- React 18
- TypeScript
- Vite
- localStorage（数据持久化）

## 数据存储

所有数据存储在浏览器 localStorage：
- `agentlab_experiments`: 实验数据
- `agentlab_skills`: 技能草稿数据
- `anthropic_api_key`: Anthropic API Key（用于 OpenClawRunner）

## 下一步建议

1. **增强 OpenClawRunner**
   - 支持工具调用（Bash、Read、Write 等）
   - 实现更精确的成功/失败判断逻辑
   - 支持流式响应和更细粒度的事件
   - 改进暂停/恢复机制

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

6. **安全性改进**
   - 使用后端代理 API 调用，避免在浏览器中暴露 API Key
   - 实现 API Key 加密存储

