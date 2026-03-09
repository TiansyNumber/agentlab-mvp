/**
 * OpenClawRunner
 *
 * 通过 OpenClaw Gateway WebSocket 接口执行 Agent 任务。
 * 接入方式：ws://localhost:<port>，token 认证，调用 agent 方法。
 *
 * 当前状态：最小闭环已打通
 * - ✅ 通过 Gateway WebSocket 发送 agent 消息
 * - ✅ 获取 agent 响应并映射到时间线事件
 * - ✅ 资源限制检查（maxSteps、maxTokens、maxDuration）
 * - ⚠️ 暂停/恢复为简化实现（停止当前轮次，重新开始）
 * - ⚠️ 需要本地 OpenClaw Gateway 运行（默认 localhost:18889）
 * - ⚠️ 需要在设置中配置 Gateway Token
 *
 * 阻塞点（如果无法打通）：
 * - Gateway 仅绑定 loopback，浏览器可直接访问 localhost
 * - 需要用户在设置中填写 Gateway Token（从 openclaw config get gateway.auth 获取）
 * - Gateway 的 WebSocket 协议为私有协议，本实现基于逆向分析
 */
import { Experiment, Event } from '../../types'
import { IExperimentRunner, RunnerStatus } from './types'

// Gateway WebSocket 消息类型（基于 openclaw gateway call 协议分析）
interface GatewayRequest {
  id: string
  method: string
  params: Record<string, unknown>
}

interface GatewayResponse {
  id?: string
  method?: string
  result?: {
    payloads?: Array<{ text: string; mediaUrl: string | null }>
    meta?: {
      durationMs: number
      agentMeta?: {
        sessionId: string
        model: string
        usage: { input: number; output: number; total: number }
      }
      aborted?: boolean
    }
  }
  error?: { message: string; code?: number }
  // streaming events
  event?: string
  data?: unknown
}

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

    // 第一轮：发送实验描述作为初始消息
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

      // 更新 token 统计
      if (result.meta?.agentMeta?.usage) {
        this.status.tokensUsed += result.meta.agentMeta.usage.total
      }

      // 保存 sessionId 用于多轮对话
      if (result.meta?.agentMeta?.sessionId) {
        this.sessionId = result.meta.agentMeta.sessionId
      }

      const responseText = result.payloads?.map(p => p.text).join('\n') || ''
      this.emitEvent('action', `步骤 ${this.status.currentStep}: ${responseText.slice(0, 150)}${responseText.length > 150 ? '...' : ''}`)

      // 检查是否完成
      if (this.isTaskComplete(responseText)) {
        this.emitEvent('success', '任务完成（成功标准匹配）')
        this.status.isRunning = false
        return
      }

      // 如果 agent 自然结束（aborted=false 且无更多内容）
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

  private async callGatewayAgent(
    gatewayUrl: string,
    token: string,
    message: string
  ): Promise<GatewayResponse['result'] | null> {
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
      const reqId = Date.now().toString()
      let resolved = false

      const timeout = setTimeout(() => {
        if (!resolved) {
          resolved = true
          ws.close()
          resolve(null)
        }
      }, 60000)

      ws.onopen = () => {
        // OpenClaw Gateway 协议：连接后发送 connect 消息（含 token）
        const connectMsg: GatewayRequest = {
          id: 'connect-' + reqId,
          method: 'connect',
          params: token ? { auth: { token } } : {}
        }
        ws.send(JSON.stringify(connectMsg))
      }

      ws.onmessage = (evt) => {
        let msg: GatewayResponse
        try {
          msg = JSON.parse(evt.data)
        } catch {
          return
        }

        // 连接确认后发送 agent 请求
        if (msg.id === 'connect-' + reqId && !msg.error) {
          const agentReq: GatewayRequest = {
            id: reqId,
            method: 'agent',
            params: {
              message,
              agentId: 'main',
              ...(this.sessionId ? { sessionId: this.sessionId } : {}),
            }
          }
          ws.send(JSON.stringify(agentReq))
          return
        }

        // agent 响应
        if (msg.id === reqId) {
          if (msg.error) {
            resolved = true
            clearTimeout(timeout)
            ws.close()
            resolve(null)
            return
          }
          if (msg.result) {
            resolved = true
            clearTimeout(timeout)
            ws.close()
            resolve(msg.result)
          }
        }
      }

      ws.onerror = () => {
        if (!resolved) {
          resolved = true
          clearTimeout(timeout)
          resolve(null)
        }
      }

      ws.onclose = () => {
        if (!resolved) {
          resolved = true
          clearTimeout(timeout)
          resolve(null)
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
    return criteria.split(/[,，]/).some(c => textLower.includes(c.trim()))
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
      this.runAgentLoop(gatewayUrl, gatewayToken).catch(err => {
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
        message
      })
    }
  }
}
