# AgentLab MVP

实验管理系统，用于创建、观察、人工介入和技能化 Agent 实验。

## 功能

### 已实现
- ✅ 完整的实验创建表单（任务描述、成功标准、失败条件、模型、工具权限、最大步数、最大Token、最大时长）
- ✅ 实验状态机（draft、running、paused、success、failed）
- ✅ 人工介入控制（继续、暂停、停止、标记成功、标记失败）
- ✅ 技能草稿生成（基于成功实验生成技能草稿）
- ✅ localStorage 持久化（刷新页面数据不丢失）
- ✅ 事件时间线（记录实验过程中的所有事件）

### Mock/待实现
- ⚠️ Agent 执行引擎（当前状态变更为手动触发，未接入真实 Agent）
- ⚠️ 工具权限实际生效（当前仅记录选择，未实际限制）
- ⚠️ 最大步数/Token/时长限制（当前仅记录配置，未实际执行）
- ⚠️ 技能草稿导出/应用（当前仅生成并保存在 localStorage）

## 运行

```bash
npm install
npm run dev
```

## 构建

```bash
npm run build
```

## 技术栈

- React 18
- TypeScript
- Vite
- localStorage（数据持久化）

## 数据存储

所有数据存储在浏览器 localStorage：
- `agentlab_experiments`: 实验数据
- `agentlab_skills`: 技能草稿数据

