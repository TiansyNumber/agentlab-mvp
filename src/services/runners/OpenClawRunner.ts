import { Experiment, Event } from '../../types'
import { IExperimentRunner, RunnerStatus } from './types'

// STUB: OpenClaw runtime integration placeholder
// To integrate OpenClaw:
// 1. Install OpenClaw SDK/client
// 2. Configure agent_id, model, tools, budget
// 3. Implement event bridge/callback for real-time updates
// 4. Map OpenClaw events to AgentLab Event types
export class OpenClawRunner implements IExperimentRunner {
  private status: RunnerStatus = { isRunning: false, currentStep: 0, tokensUsed: 0, elapsedMs: 0 }

  async start(_experiment: Experiment, _onEvent: (event: Event) => void): Promise<void> {
    throw new Error('OpenClawRunner not implemented. This is a stub for future integration.')
    // TODO: Initialize OpenClaw runtime with:
    // - agent_id: experiment.id
    // - model: experiment.model
    // - tools: experiment.tools
    // - max_steps: experiment.maxSteps
    // - max_tokens: experiment.maxTokens
    // - timeout: experiment.maxDuration
    // - callback: onEvent wrapper
  }

  async pause(): Promise<void> {
    throw new Error('OpenClawRunner not implemented')
  }

  async resume(): Promise<void> {
    throw new Error('OpenClawRunner not implemented')
  }

  async stop(): Promise<void> {
    throw new Error('OpenClawRunner not implemented')
  }

  getStatus(): RunnerStatus {
    return { ...this.status }
  }
}
