import { Experiment, Event } from '../../types'
import { IExperimentRunner, RunnerStatus } from './types'

export class MockRunner implements IExperimentRunner {
  private status: RunnerStatus = { isRunning: false, currentStep: 0, tokensUsed: 0, elapsedMs: 0 }
  private experiment: Experiment | null = null
  private onEvent: ((event: Event) => void) | null = null
  private intervalId: number | null = null
  private startTime: number = 0
  private isPaused: boolean = false

  async start(experiment: Experiment, onEvent: (event: Event) => void): Promise<void> {
    this.experiment = experiment
    this.onEvent = onEvent
    this.status = { isRunning: true, currentStep: 0, tokensUsed: 0, elapsedMs: 0 }
    this.startTime = Date.now()
    this.isPaused = false

    this.emitEvent('start', `实验开始: ${experiment.name}`)
    this.runLoop()
  }

  private runLoop() {
    if (!this.experiment || !this.onEvent) return

    this.intervalId = setInterval(() => {
      if (this.isPaused || !this.status.isRunning) return

      this.status.currentStep++
      this.status.tokensUsed += Math.floor(Math.random() * 100) + 50
      this.status.elapsedMs = Date.now() - this.startTime

      this.emitEvent('action', `步骤 ${this.status.currentStep}: 执行中...`)

      // Check limits
      if (this.status.currentStep >= this.experiment!.maxSteps) {
        this.completeExperiment('success', `达到最大步数 ${this.experiment!.maxSteps}`)
        return
      }

      if (this.status.tokensUsed >= this.experiment!.maxTokens) {
        this.completeExperiment('failed', `超过最大Token ${this.experiment!.maxTokens}`)
        return
      }

      if (this.status.elapsedMs >= this.experiment!.maxDuration * 1000) {
        this.completeExperiment('failed', `超过最大时长 ${this.experiment!.maxDuration}秒`)
        return
      }
    }, 2000)
  }

  private completeExperiment(type: 'success' | 'failed', message: string) {
    this.emitEvent(type, message)
    this.cleanup()
  }

  async pause(): Promise<void> {
    this.isPaused = true
    this.emitEvent('pause', '实验已暂停')
  }

  async resume(): Promise<void> {
    this.isPaused = false
    this.emitEvent('resume', '实验已恢复')
  }

  async stop(): Promise<void> {
    this.emitEvent('stop', '实验已停止')
    this.cleanup()
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

  private cleanup() {
    if (this.intervalId) {
      clearInterval(this.intervalId)
      this.intervalId = null
    }
    this.status.isRunning = false
  }
}
