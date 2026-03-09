/**
 * AnthropicRunner
 *
 * 直接调用 Anthropic SDK（@anthropic-ai/sdk）执行 Agent 任务。
 * 这是当前唯一真正可运行的 runner，通过浏览器端 API Key 调用 Claude。
 */
import Anthropic from '@anthropic-ai/sdk'
import { Experiment, Event } from '../../types'
import { IExperimentRunner, RunnerStatus } from './types'

export class AnthropicRunner implements IExperimentRunner {
  private status: RunnerStatus = { isRunning: false, currentStep: 0, tokensUsed: 0, elapsedMs: 0 }
  private experiment: Experiment | null = null
  private onEvent: ((event: Event) => void) | null = null
  private startTime: number = 0
  private shouldStop: boolean = false
  private client: Anthropic | null = null

  async start(experiment: Experiment, onEvent: (event: Event) => void): Promise<void> {
    this.experiment = experiment
    this.onEvent = onEvent
    this.status = { isRunning: true, currentStep: 0, tokensUsed: 0, elapsedMs: 0 }
    this.startTime = Date.now()
    this.shouldStop = false

    const apiKey = localStorage.getItem('anthropic_api_key')
    if (!apiKey) {
      this.emitEvent('failed', '错误: 未配置 Anthropic API Key。请在设置中添加。')
      this.status.isRunning = false
      return
    }

    this.client = new Anthropic({ apiKey, dangerouslyAllowBrowser: true })
    this.emitEvent('start', `实验开始: ${experiment.name}`)

    this.executeAgent()
  }

  private async executeAgent() {
    if (!this.experiment || !this.client) return

    try {
      const messages: Anthropic.MessageParam[] = [
        { role: 'user', content: this.experiment.description }
      ]

      while (!this.shouldStop && this.status.isRunning) {
        this.status.currentStep++
        this.status.elapsedMs = Date.now() - this.startTime

        if (this.checkLimits()) return

        this.emitEvent('action', `步骤 ${this.status.currentStep}: 调用 ${this.experiment.model}...`)

        const response = await this.client.messages.create({
          model: this.experiment.model,
          max_tokens: Math.min(4096, this.experiment.maxTokens - this.status.tokensUsed),
          messages
        })

        this.status.tokensUsed += response.usage.input_tokens + response.usage.output_tokens

        const content = response.content[0]
        if (content.type === 'text') {
          this.emitEvent('action', `步骤 ${this.status.currentStep}: ${content.text.slice(0, 100)}...`)

          if (this.isTaskComplete(content.text)) {
            this.emitEvent('success', '任务完成')
            this.status.isRunning = false
            return
          }

          messages.push({ role: 'assistant', content: response.content })
          messages.push({ role: 'user', content: '继续执行任务' })
        }

        if (response.stop_reason === 'end_turn') {
          this.emitEvent('success', '对话自然结束')
          this.status.isRunning = false
          return
        }
      }
    } catch (error) {
      this.emitEvent('failed', `执行错误: ${error instanceof Error ? error.message : String(error)}`)
      this.status.isRunning = false
    }
  }

  private checkLimits(): boolean {
    if (!this.experiment) return true

    if (this.status.currentStep >= this.experiment.maxSteps) {
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
    this.emitEvent('pause', '实验已暂停')
  }

  async resume(): Promise<void> {
    this.shouldStop = false
    this.emitEvent('resume', '实验已恢复')
    if (this.status.isRunning) {
      this.executeAgent()
    }
  }

  async stop(): Promise<void> {
    this.shouldStop = true
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
