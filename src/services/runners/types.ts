import { Experiment, Event } from '../../types'

export interface RunnerStatus {
  isRunning: boolean
  currentStep: number
  tokensUsed: number
  elapsedMs: number
}

export interface IExperimentRunner {
  start(experiment: Experiment, onEvent: (event: Event) => void): Promise<void>
  pause(): Promise<void>
  resume(): Promise<void>
  stop(): Promise<void>
  getStatus(): RunnerStatus
}
