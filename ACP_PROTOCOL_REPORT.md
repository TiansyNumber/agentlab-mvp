# ACP 协议格式对齐报告

**日期**: 2026-03-10
**任务**: ACP 协议格式 / 握手报文 / 消息 schema 对齐

---

## 1. 已确认的 ACP 协议格式

### 消息帧格式

#### Request Frame
```json
{
  "type": "req",
  "id": "unique-id",
  "method": "method.name",
  "params": {}
}
```

#### Response Frame
```json
{
  "type": "res",
  "id": "request-id",
  "ok": true/false,
  "payload": {},
  "error": {}
}
```

#### Event Frame
```json
{
  "type": "event",
  "event": "event.name",
  "payload": {}
}
```

### 关键发现

**之前错误的格式**:
- ❌ `type: "request"` → 正确: `type: "req"`
- ❌ `type: "response"` → 正确: `type: "res"`
- ❌ `method: "connect.authenticate"` → 正确: `method: "connect"`

---

## 2. ACP 握手流程

### Step 1: Gateway 发送 Challenge
```json
{
  "type": "event",
  "event": "connect.challenge",
  "payload": {
    "nonce": "uuid",
    "ts": 1773119031028
  }
}
```

### Step 2: Client 发送 Connect
```json
{
  "type": "req",
  "id": "connect-1",
  "method": "connect",
  "params": {
    "minProtocol": 3,
    "maxProtocol": 3,
    "client": {
      "id": "node-host",
      "version": "0.1.0",
      "platform": "node",
      "mode": "backend"
    },
    "auth": {
      "password": ""
    }
  }
}
```

### Step 3: Gateway 响应

**成功**:
```json
{
  "type": "res",
  "id": "connect-1",
  "ok": true,
  "payload": {}
}
```

**失败**:
```json
{
  "type": "res",
  "id": "connect-1",
  "ok": false,
  "error": {
    "code": "NOT_PAIRED",
    "message": "device identity required"
  }
}
```

---

## 3. 协议版本要求

- **当前 Gateway 要求**: Protocol v3
- **测试结果**:
  - ❌ Protocol v1: `protocol mismatch, expectedProtocol: 3`
  - ✅ Protocol v3: 接受但要求设备配对

---

## 4. Client 参数规范

### 有效的 Client ID (必须使用以下之一)
```javascript
GATEWAY_CLIENT_IDS = {
  "webchat-ui",
  "openclaw-control-ui",
  "webchat",
  "cli",
  "gateway-client",
  "openclaw-macos",
  "openclaw-ios",
  "openclaw-android",
  "node-host",      // ← 我们使用这个
  "test",
  "fingerprint",
  "openclaw-probe"
}
```

### 有效的 Client Mode (必须使用以下之一)
```javascript
GATEWAY_CLIENT_MODES = {
  "webchat",
  "cli",
  "ui",
  "backend",        // ← 我们使用这个
  "node",
  "probe",
  "test"
}
```

---

## 5. 当前精确失败阶段

### ✅ 已完成
1. WebSocket 连接成功
2. 接收 `connect.challenge` 事件
3. 发送正确格式的 `connect` 请求
4. Protocol v3 版本对齐

### ⚠️ 当前卡点: 设备配对 (Device Pairing)

**错误信息**:
```
code: "NOT_PAIRED"
message: "device identity required"
details: { code: "DEVICE_IDENTITY_REQUIRED" }
```

**原因分析**:
- Gateway 要求设备身份验证
- 即使 `security.approval_mode: "off"` 也需要设备配对
- 需要提供 `device` 参数或有效的 `auth.token`

---

## 6. 设备配对要求

### Connect Params Schema (完整)
```typescript
{
  minProtocol: number,
  maxProtocol: number,
  client: {
    id: string,              // 必须是有效的 GATEWAY_CLIENT_IDS
    displayName?: string,
    version: string,
    platform: string,
    deviceFamily?: string,
    modelIdentifier?: string,
    mode: string,            // 必须是有效的 GATEWAY_CLIENT_MODES
    instanceId?: string
  },
  caps?: string[],
  commands?: string[],
  permissions?: Record<string, boolean>,
  pathEnv?: string,
  role?: string,
  scopes?: string[],
  device?: {                 // 设备签名认证
    id: string,
    publicKey: string,
    signature: string,
    signedAt: number,
    nonce: string
  },
  auth?: {                   // 或使用 token/password
    token?: string,
    deviceToken?: string,
    password?: string
  }
}
```

---

## 7. 下一步方案

### 方案 A: 设备配对流程 (推荐)
1. 生成设备密钥对
2. 向 Gateway 发起配对请求
3. 用户在 OpenClaw UI 批准配对
4. 使用设备签名进行后续连接

### 方案 B: Token 认证
1. 从 OpenClaw 获取 auth token
2. 在 connect 时提供 `auth.token`

### 方案 C: 修改 Gateway 配置
1. 检查是否有禁用设备配对的配置选项
2. 修改 `~/.openclaw/config.yaml` 添加相关配置

---

## 8. 改动文件清单

### 已修改
1. `/connector/src/connector.ts` - 更新为正确的 ACP 协议格式
   - 修改消息类型: `type: "req"` 而非 `"request"`
   - 修改握手方法: `method: "connect"` 而非 `"connect.authenticate"`
   - 更新协议版本: `minProtocol: 3, maxProtocol: 3`
   - 添加 client 参数: `id: "node-host", mode: "backend"`
   - 添加 auth 参数: `password: ""`

### 新增事件类型
- `acp_connecting` - 开始连接
- `acp_ws_open` - WebSocket 打开
- `acp_challenge_received` - 收到握手挑战
- `acp_connect_sent` - 发送连接请求
- `acp_handshake_complete` - 握手完成
- `acp_connect_failed` - 连接失败
- `acp_prompt_sent` - 发送提示
- `acp_prompt_response` - 提示响应
- `acp_event` - ACP 事件
- `acp_parse_error` - 解析错误
- `acp_error` - 错误
- `acp_closed` - 连接关闭
- `acp_incomplete` - 未完成
- `acp_timeout` - 超时
- `acp_failed` - 失败

---

## 9. 验证结果

### 测试命令
```bash
node test_protocol_v3.mjs
```

### 实际输出
```
✅ WebSocket open
📥 {"type":"event","event":"connect.challenge","payload":{"nonce":"...","ts":...}}
📤 Sending connect (protocol v3)
📥 {"type":"res","id":"connect-1","ok":false,"error":{"code":"NOT_PAIRED","message":"device identity required"}}
🔌 code=1008 reason=device identity required
```

### 结论
- ✅ ACP 协议格式已完全对齐
- ✅ Gateway 接受并解析消息
- ✅ 握手流程正确
- ⚠️ 需要设备配对才能继续

---

## 10. 最新 Commit

```bash
git add connector/src/connector.ts
git commit -m "feat: align ACP protocol format with Gateway v3 requirements"
```

待执行。

---

## 总结

### 本轮完成
1. ✅ 完全摸清 ACP 协议格式
2. ✅ 确认正确的消息帧结构 (`req`/`res`/`event`)
3. ✅ 确认握手流程 (`connect.challenge` → `connect`)
4. ✅ 确认协议版本要求 (v3)
5. ✅ 确认 client 参数规范
6. ✅ 更新 connector 代码到正确格式

### 当前精确失败阶段
**acp_device_pairing_required** - Gateway 要求设备配对认证

### 不是协议格式问题
- 协议格式已完全正确
- Gateway 正常接受并响应
- 失败原因是安全认证，非协议不匹配

### 下一步
需要实现设备配对或 token 认证机制。
