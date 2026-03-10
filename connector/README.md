# AgentLab CLI Connector V0

轻量级本地 Runtime 接入工具，让你无需手动填写 localhost URL 到网页。

## 这是什么

AgentLab CLI Connector 是一个命令行工具，用于将本地运行的 OpenClaw Runtime 自动注册到 AgentLab 平台。

**为什么需要它？**
- 不再需要手动复制粘贴 `http://localhost:18889` 到网页
- 自动管理 device_id
- 自动发送心跳保持在线状态
- 一条命令完成接入

## 快速开始

### 1. 构建 CLI

```bash
cd connector
npm install
npm run build
```

### 2. 运行连接器

```bash
npm start
```

或使用自定义参数：

```bash
node dist/cli.js start --backend https://agentlab-backend.tianshuyun.workers.dev --gateway http://localhost:18889 --name "我的本地 Runtime"
```

### 3. 运行后会发生什么

连接器会：
1. 检测或生成 device_id（保存在 `~/.agentlab/connector.json`）
2. 向 AgentLab backend 注册你的本地 runtime
3. 输出 runtime_id 和状态
4. 每 30 秒发送一次心跳保持在线
5. 按 Ctrl+C 停止

## 命令参数

```
agentlab-connect start [options]

Options:
  --backend <url>   Backend URL (默认: https://agentlab-backend.tianshuyun.workers.dev)
  --gateway <url>   Gateway URL (默认: http://localhost:18889)
  --name <name>     Runtime 显示名称 (默认: Local OpenClaw)
```

## V0 功能范围

当前 V0 版本支持：
- ✅ 自动注册本地 runtime 到 AgentLab
- ✅ 自动生成和管理 device_id
- ✅ 心跳机制（30秒间隔）
- ✅ 命令行参数配置

V0 不包含：
- ❌ 安装程序
- ❌ 菜单栏 app
- ❌ 开机自启动
- ❌ GUI 界面

## 前置条件

1. 本地已运行 OpenClaw Gateway（默认端口 18889）
2. Node.js 环境

## 示例输出

```
🚀 AgentLab Connector V0
Backend: https://agentlab-backend.tianshuyun.workers.dev
Gateway: http://localhost:18889
Name: Local OpenClaw

Registering runtime...
✅ Runtime registered: 550e8400-e29b-41d4-a716-446655440000
Status: online
Device ID: 123e4567-e89b-12d3-a456-426614174000

Starting heartbeat (30s interval)...
✅ Connector running. Press Ctrl+C to stop.
```

## 配置文件

Connector 会在 `~/.agentlab/connector.json` 保存配置：

```json
{
  "deviceId": "123e4567-e89b-12d3-a456-426614174000"
}
```

## 下一步

V0 验证通过后，后续版本可能包括：
- 更友好的安装方式
- 后台运行支持
- 更完善的错误处理
- 日志记录
