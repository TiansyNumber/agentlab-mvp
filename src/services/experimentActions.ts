import { Experiment, Event } from '../types'

// Mock: 未来接入真实 Agent 执行引擎的入口
export class ExperimentRunner {
  async start(experiment: Experiment): Promise<void> {
    // TODO: 接入真实 Agent runtime
    console.log('[MOCK] Starting experiment:', experiment.id)
  }

  async pause(experimentId: string): Promise<void> {
    // TODO: 暂停 Agent 执行
    console.log('[MOCK] Pausing experiment:', experimentId)
  }

  async resume(experimentId: string): Promise<void> {
    // TODO: 恢复 Agent 执行
    console.log('[MOCK] Resuming experiment:', experimentId)
  }

  async stop(experimentId: string): Promise<void> {
    // TODO: 停止 Agent 执行
    console.log('[MOCK] Stopping experiment:', experimentId)
  }
}

export function createEvent(type: Event['type'], message: string): Event {
  return {
    id: Date.now().toString(),
    timestamp: new Date().toLocaleTimeString(),
    type,
    message
  }
}
