/**
 * OpenClawRunner
 *
 * 通过 OpenClaw Gateway WebSocket 接口执行 Agent 任务。
 *
 * 真实 Gateway 协议（逆向自 /usr/local/lib/node_modules/openclaw/dist/call-CbaJN9rS.js）：
 *
 * 1. WebSocket 连接建立后，Gateway 先发送 connect.challenge 事件：
 *    { type: "event", event: "connect.challenge", payload: { nonce: "..." } }
 *
 * 2. 客户端收到 challenge 后，发送 connect 请求：
 *    { type: "req", id: "<uuid>", method: "connect", params: {
 *        minProtocol: 3, maxProtocol: 3,
 *        client: { id: "cli", version: "1.0.0", platform: "browser", mode: "cli" },
 *        auth: { token: "<gateway_token>" },
 *        role: "operator",
 *        scopes: ["operator.admin", "operator.read", "operator.write", ...],
 *        caps: []
 *    }}
 *
 * 3. Gateway 响应 hello-ok：
 *    { type: "res", id: "<same-uuid>", ok: true, payload: { type: "hello-ok", ... } }
 *
 * 4. 客户端发送 agent 请求（需要 expectFinal，先收到 accepted 再收到 final）：
 *    { type: "req", id: "<uuid>", method: "agent", params: {
 *        message: "...",
 *        idempotencyKey: "<uuid>",
 *        agentId: "main"   // optional
 *    }}
 *
 * 5. Gateway 先响应 accepted：
 *    { type: "res", id: "<same-uuid>", ok: true, payload: { status: "accepted", runId: "..." } }
 *    然后响应 final（当 agent 完成时）：
 *    { type: "res", id: "<same-uuid>", ok: true, payload: { status: "final", ... } }
 *
 * 关键修正：
 * - 所有帧必须有 type 字段（"req" / "res" / "event"）
 * - connect 不是在 onopen 直接发，而是等 connect.challenge 事件
 * - agent 请求需要 idempotencyKey（必填 NonEmptyString）
 * - 响应帧格式是 { type: "res", id, ok, payload }，不是 { id, result }
 */
import { Experiment, Event } from '../../types'
import { IExperimentRunner, RunnerStatus } from './types'

// 真实 Gateway 帧格式
interface ReqFrame {
  type: 'req'
  id: string
  method: string
  params?: unknown
}

interface ResFrame {
  type: 'res'
  id: string
  ok: boolean
  payload?: unknown
  error?: { code?: string; message: string }
}

interface EventFrame {
  type: 'event'
  event: string
  payload?: unknown
  seq?: number
}

type GatewayFrame = ReqFrame | ResFrame | EventFrame

// agent 方法的 payload 结构（final 响应）
interface AgentFinalPayload {
  status?: string
  runId?: string
  reply?: string
  text?: string
  payloads?: Array<{ text: string; mediaUrl: string | null }>
  meta?: {
    durationMs?: number
    agentMeta?: {
      sessionId?: string
      model?: string
      usage?: { input: number; output: number; total: number }
    }
    aborted?: boolean
  }
}

function randomUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

const GATEWAY_SCOPES = [
  'operator.admin',
  'operator.read',
  'operator.write',
  'operator.approvals',
  'operator.pairing',
]

export class OpenClawRunner implements IExperimentRunner {
  private status: RunnerStatus = { isRunning: false, currentStep: 0, tokensUsed: 0, elapsedMs: 0 }
  private experiment: Experiment | null = null
  private onEvent: ((event: Event) => void) | null = null
  private startTime: number = 0
  private shouldStop: boolean = false
  private ws: WebSocket | null = null
  private sessionId: string | null = null

  async start(experiment: Experiment, onEvent: (event: Event) => void): Promise<void> {
    this.experiment = experiment
    this.onEvent = onEvent
    this.status = { isRunning: true, currentStep: 0, tokensUsed: 0, elapsedMs: 0 }
    this.startTime = Date.now()
    this.shouldStop = false
    this.sessionId = null

    const gatewayUrl = localStorage.getItem('openclaw_gateway_url') || 'ws://localhost:18889'
    const gatewayToken = localStorage.getItem('openclaw_gateway_token') || ''

    this.emitEvent('start', `实验开始: ${experiment.name}（OpenClaw Gateway: ${gatewayUrl}）`)

    try {
      await this.runAgentLoop(gatewayUrl, gatewayToken)
    } catch (error) {
      this.emitEvent('failed', `OpenClaw 执行错误: ${error instanceof Error ? error.message : String(error)}`)
      this.status.isRunning = false
    }
  }

  private async runAgentLoop(gatewayUrl: string, gatewayToken: string): Promise<void> {
    if (!this.experiment) return

    const initialMessage = this.buildInitialMessage()

    while (!this.shouldStop && this.status.isRunning) {
      this.status.currentStep++
      this.status.elapsedMs = Date.now() - this.startTime

      if (this.checkLimits()) return

      const message = this.status.currentStep === 1 ? initialMessage : '继续执行任务，报告当前进展。'
      this.emitEvent('action', `步骤 ${this.status.currentStep}: 发送消息到 OpenClaw Gateway...`)

      const result = await this.callGatewayAgent(gatewayUrl, gatewayToken, message)

      if (!result) {
        this.emitEvent('failed', 'Gateway 无响应或连接失败')
        this.status.isRunning = false
        return
      }

      if (result.meta?.agentMeta?.usage) {
        this.status.tokensUsed += result.meta.agentMeta.usage.total
      }

      if (result.meta?.agentMeta?.sessionId) {
        this.sessionId = result.meta.agentMeta.sessionId
      }

      const responseText =
        result.reply ||
        result.text ||
        result.payloads?.map((p) => p.text).join('\n') ||
        ''

      this.emitEvent(
        'action',
        `步骤 ${this.status.currentStep}: ${responseText.slice(0, 150)}${responseText.length > 150 ? '...' : ''}`
      )

      if (this.isTaskComplete(responseText)) {
        this.emitEvent('success', '任务完成（成功标准匹配）')
        this.status.isRunning = false
        return
      }

      if (result.meta?.aborted === false && this.status.currentStep >= 2) {
        this.emitEvent('success', 'Agent 执行完成')
        this.status.isRunning = false
        return
      }
    }
  }

  private buildInitialMessage(): string {
    if (!this.experiment) return ''
    return [
      `任务: ${this.experiment.description}`,
      `成功标准: ${this.experiment.successCriteria}`,
      `失败条件: ${this.experiment.failureConditions || '无'}`,
      `最大步数: ${this.experiment.maxSteps}`,
    ].join('\n')
  }

  /**
   * 与 Gateway 建立 WebSocket 连接，完成 challenge→connect 握手，
   * 然后发送 agent 请求，等待 final 响应。
   */
  private async callGatewayAgent(
    gatewayUrl: string,
    token: string,
    message: string
  ): Promise<AgentFinalPayload | null> {
    return new Promise((resolve) => {
      const wsUrl = gatewayUrl.replace(/^http/, 'ws')
      let ws: WebSocket

      try {
        ws = new WebSocket(wsUrl)
      } catch {
        resolve(null)
        return
      }

      this.ws = ws
      let resolved = false
      let connectId: string | null = null
      let agentId: string | null = null
      let connectDone = false

      const done = (result: AgentFinalPayload | null) => {
        if (resolved) return
        resolved = true
        clearTimeout(timeout)
        try { ws.close() } catch { /* ignore */ }
        resolve(result)
      }

      const timeout = setTimeout(() => {
        if (!resolved) {
          this.emitEvent('action', '[调试] Gateway 请求超时（60s）')
          done(null)
        }
      }, 60000)

      ws.onopen = () => {
        // 等待 connect.challenge 事件，不主动发送任何内容
        this.emitEvent('action', '[调试] WebSocket 已连接，等待 connect.challenge...')
      }

      ws.onmessage = (evt) => {
        let frame: GatewayFrame
        try {
          frame = JSON.parse(evt.data as string) as GatewayFrame
        } catch {
          return
        }

        // 处理 event 帧
        if (frame.type === 'event') {
          const ef = frame as EventFrame

          if (ef.event === 'connect.challenge') {
            const nonce = (ef.payload as { nonce?: string })?.nonce
            this.emitEvent('action', `[调试] 收到 connect.challenge，nonce=${nonce ?? '(无)'}`)

            // 发送 connect 请求
            connectId = randomUUID()
            const connectReq: ReqFrame = {
              type: 'req',
              id: connectId,
              method: 'connect',
              params: {
                minProtocol: 3,
                maxProtocol: 3,
                client: {
                  id: 'cli',
                  version: '1.0.0',
                  platform: 'browser',
                  mode: 'cli',
                },
                caps: [],
                role: 'operator',
                scopes: GATEWAY_SCOPES,
                ...(token ? { auth: { token } } : {}),
              },
            }
            ws.send(JSON.stringify(connectReq))
            this.emitEvent('action', '[调试] 已发送 connect 请求...')
            return
          }

          // tick / 其他事件忽略
          return
        }

        // 处理 res 帧
        if (frame.type === 'res') {
          const rf = frame as ResFrame

          // connect 响应
          if (rf.id === connectId && !connectDone) {
            connectDone = true
            if (!rf.ok) {
              const errMsg = rf.error?.message ?? 'connect 失败（未知错误）'
              this.emitEvent('action', `[调试] connect 失败: ${errMsg}`)
              done(null)
              return
            }

            this.emitEvent('action', '[调试] connect 握手成功，发送 agent 请求...')

            // 发送 agent 请求
            agentId = randomUUID()
            const agentReq: ReqFrame = {
              type: 'req',
              id: agentId,
              method: 'agent',
              params: {
                message,
                idempotencyKey: randomUUID(),
                ...(this.sessionId ? { sessionKey: this.sessionId } : {}),
              },
            }
            ws.send(JSON.stringify(agentReq))
            return
          }

          // agent 响应
          if (rf.id === agentId) {
            if (!rf.ok) {
              const errMsg = rf.error?.message ?? 'agent 请求失败（未知错误）'
              this.emitEvent('action', `[调试] agent 失败: ${errMsg}`)
              done(null)
              return
            }

            const payload = rf.payload as AgentFinalPayload | undefined
            const status = payload?.status

            // accepted 是中间状态，继续等待 final
            if (status === 'accepted') {
              const runId = payload?.runId ?? ''
              this.emitEvent('action', `[调试] agent 已接受（runId=${runId}），等待 final 响应...`)
              return
            }

            // final 或其他终态
            this.emitEvent('action', `[调试] agent 响应完成（status=${status ?? '无'}）`)
            done(payload ?? {})
          }
        }
      }

      ws.onerror = (err) => {
        if (!resolved) {
          const msg = err instanceof ErrorEvent ? err.message : 'WebSocket 错误'
          this.emitEvent('action', `[调试] WebSocket 错误: ${msg}`)
          done(null)
        }
      }

      ws.onclose = (evt) => {
        if (!resolved) {
          this.emitEvent('action', `[调试] WebSocket 关闭: code=${evt.code} reason=${evt.reason || '(无)'}`)
          done(null)
        }
      }
    })
  }

  private checkLimits(): boolean {
    if (!this.experiment) return true

    if (this.status.currentStep > this.experiment.maxSteps) {
      this.emitEvent('success', `达到最大步数 ${this.experiment.maxSteps}`)
      this.status.isRunning = false
      return true
    }

    if (this.status.tokensUsed >= this.experiment.maxTokens) {
      this.emitEvent('failed', `超过最大Token ${this.experiment.maxTokens}`)
      this.status.isRunning = false
      return true
    }

    if (this.status.elapsedMs >= this.experiment.maxDuration * 1000) {
      this.emitEvent('failed', `超过最大时长 ${this.experiment.maxDuration}秒`)
      this.status.isRunning = false
      return true
    }

    return false
  }

  private isTaskComplete(text: string): boolean {
    if (!this.experiment) return false
    const criteria = this.experiment.successCriteria.toLowerCase()
    const textLower = text.toLowerCase()
    return criteria.split(/[,，]/).some((c) => textLower.includes(c.trim()))
  }

  async pause(): Promise<void> {
    this.shouldStop = true
    if (this.ws) {
      this.ws.close()
      this.ws = null
    }
    this.emitEvent('pause', '实验已暂停（当前轮次中断）')
  }

  async resume(): Promise<void> {
    this.shouldStop = false
    this.emitEvent('resume', '实验已恢复')
    if (this.status.isRunning && this.experiment && this.onEvent) {
      const gatewayUrl = localStorage.getItem('openclaw_gateway_url') || 'ws://localhost:18889'
      const gatewayToken = localStorage.getItem('openclaw_gateway_token') || ''
      this.runAgentLoop(gatewayUrl, gatewayToken).catch((err) => {
        this.emitEvent('failed', `恢复执行错误: ${err instanceof Error ? err.message : String(err)}`)
        this.status.isRunning = false
      })
    }
  }

  async stop(): Promise<void> {
    this.shouldStop = true
    if (this.ws) {
      this.ws.close()
      this.ws = null
    }
    this.emitEvent('stop', '实验已停止')
    this.status.isRunning = false
  }

  getStatus(): RunnerStatus {
    return { ...this.status }
  }

  private emitEvent(type: Event['type'], message: string) {
    if (this.onEvent) {
      this.onEvent({
        id: Date.now().toString() + Math.random(),
        timestamp: new Date().toLocaleTimeString(),
        type,
        message,
      })
    }
  }
}
