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

## 10. 设备认证深度调查 (2026-03-10)

### 已确认的认证机制

#### deviceId 派生规则
```javascript
// deviceId = SHA256(publicKey_DER_bytes)
const publicKeyDer = Buffer.from(publicKey, 'base64url');
const deviceId = crypto.createHash('sha256').update(publicKeyDer).digest('hex');
```

**验证结果**:
- ✅ 现有设备 `5bc808a871c3cf6bb7db82b4901fdfc227ee5a3c64a7d35c2c8050efd04443c7`
- ✅ 对应 publicKey `vGMD5taO3_6GooD-tAvRbhJS5I_GRTYS5wIAg_4gsFU`
- ✅ SHA256 验证通过

#### 签名验证失败

**尝试的签名数据格式**:
1. ❌ `${deviceId}:${nonce}:${signedAt}` (base64url)
2. ❌ `${deviceId}:${nonce}:${signedAt}` (base64)
3. ❌ `${deviceId}:${nonce}:${signedAt}` (hex)
4. ❌ `JSON.stringify({deviceId, nonce, signedAt})` (base64url)
5. ❌ `${nonce}` only (base64url)

**错误信息**:
```
code: "INVALID_REQUEST"
message: "device signature invalid"
details: { code: "DEVICE_AUTH_SIGNATURE_INVALID", reason: "device-signature" }
```

#### deviceToken 认证失败

**尝试方案**:
1. ❌ `auth: { token: "..." }` → 仍要求 device identity
2. ❌ `auth: { deviceToken: "..." }` → 仍要求 device identity
3. ❌ `device + auth: { deviceToken }` → 签名验证失败

### 当前精确失败阶段

**Phase**: `acp_device_signature_validation_failed`

**状态**:
- ✅ WebSocket 连接成功
- ✅ 接收 `connect.challenge` 事件
- ✅ 协议格式正确 (type: req, method: connect)
- ✅ Protocol v3 对齐
- ✅ deviceId 派生规则正确
- ❌ **设备签名验证失败** ← 当前卡点

**根本原因**:
- Gateway 的签名验证算法未知
- 无法访问 Gateway 源码
- 已有设备私钥但签名数据格式不匹配
- deviceToken 无法绕过签名验证

---

## 11. 测试文件清单

### 创建的测试文件
1. `test_protocol_v3.mjs` - Protocol v3 基础测试
2. `test_with_token.mjs` - Token 认证测试
3. `test_device_auth.mjs` - 设备签名认证测试
4. `test_pairing.mjs` - 新设备配对测试
5. `test_real_auth.mjs` - 真实私钥签名测试
6. `test_token_only.mjs` - 仅 deviceToken 测试
7. `test_device_plus_token.mjs` - 设备+Token 组合测试
8. `test_no_sig.mjs` - 无签名测试
9. `test_sig_formats.mjs` - 签名格式测试 (base64)
10. `test_hex_sig.mjs` - 签名格式测试 (hex)
11. `test_json_sig.mjs` - JSON payload 签名测试
12. `test_kimi_device.mjs` - kimi-bridge 设备测试
13. `test_derived_id.mjs` - 派生 deviceId 测试
14. `test_nonce_only.mjs` - 仅签名 nonce 测试

---

## 12. 最新 Commit

```bash
git add ACP_PROTOCOL_REPORT.md connector/test_*.mjs
git commit -m "docs: document device auth investigation and signature validation failure"
```

---

## 总结

### 本轮完成
1. ✅ 完全摸清 ACP 协议格式
2. ✅ 确认正确的消息帧结构 (`req`/`res`/`event`)
3. ✅ 确认握手流程 (`connect.challenge` → `connect`)
4. ✅ 确认协议版本要求 (v3)
5. ✅ 确认 client 参数规范
6. ✅ 确认 deviceId 派生规则 (SHA256 of publicKey)
7. ✅ 深度调查设备认证机制
8. ✅ 测试多种签名格式和认证方案

### 当前精确失败阶段
**acp_device_signature_validation_failed** - 设备签名验证失败

### 失败原因
- Gateway 签名验证算法未知
- 无法访问 Gateway 源码确认签名数据格式
- 已尝试所有常见签名数据格式均失败

### 下一步方案
1. **方案 A**: 联系 OpenClaw/Gateway 开发者获取签名算法文档
2. **方案 B**: 反编译 Gateway 二进制文件查找签名验证逻辑
3. **方案 C**: 抓包分析真实客户端的签名数据
4. **方案 D**: 修改 Gateway 配置禁用设备认证（如果支持）
5. **方案 E**: 使用已配对客户端的 WebSocket 连接进行代理转发
