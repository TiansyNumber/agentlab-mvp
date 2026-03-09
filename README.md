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
- ✅ 状态可视化（不同状态显示不同颜色）
- ✅ 代码结构分层（UI层、数据层、服务层）

### Mock/待实现
- ⚠️ **Agent 执行引擎**（当前状态变更为手动触发，未接入真实 Agent runtime）
  - 入口已预留：`src/services/experimentActions.ts` 中的 `ExperimentRunner` 类
  - 需要接入真实的 Agent SDK 或执行引擎
- ⚠️ **工具权限实际生效**（当前仅记录选择，未实际限制工具调用）
- ⚠️ **最大步数/Token/时长限制**（当前仅记录配置，未实际执行限制逻辑）
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
│   └── experimentActions.ts   # 实验动作服务层（预留 Agent 执行引擎接入点）
└── components/
    ├── ExperimentList.tsx     # 实验列表组件
    ├── ExperimentForm.tsx     # 实验创建表单
    ├── ExperimentDetail.tsx   # 实验详情和控制面板
    └── SkillList.tsx          # 技能列表组件
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

## 下一步建议

1. **接入真实 Agent 执行引擎**
   - 在 `src/services/experimentActions.ts` 中实现 `ExperimentRunner` 类的真实逻辑
   - 集成 Agent SDK（如 Claude Agent SDK 或自定义 runtime）
   - 实现真实的工具调用和权限控制

2. **实现资源限制**
   - 在 Agent 执行过程中监控步数、Token 使用量、执行时长
   - 达到限制时自动暂停或停止实验

3. **技能导出和应用**
   - 实现技能草稿导出为 JSON/YAML 文件
   - 支持将技能应用到 Agent 系统（如 Kiro 的 skills）

4. **增强事件时间线**
   - 记录更详细的 Agent 执行过程（工具调用、思考过程、错误信息）
   - 支持事件过滤和搜索

5. **后端持久化**（可选）
   - 替换 localStorage 为真实数据库
   - 支持多用户和团队协作

