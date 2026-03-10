export type ExperimentStatus = 'draft' | 'running' | 'paused' | 'success' | 'failed'

export interface Experiment {
  id: string
  name: string
  description: string
  successCriteria: string
  failureConditions: string
  model: string
  tools: string[]
  maxSteps: number
  maxTokens: number
  maxDuration: number
  status: ExperimentStatus
  createdAt: string
  events: Event[]
  runtimeId?: string
  runtimeMode?: string
}

export interface Event {
  id: string
  timestamp: string
  type: 'start' | 'action' | 'intervention' | 'complete' | 'pause' | 'resume' | 'stop' | 'success' | 'failed'
  message: string
}

export interface SkillDraft {
  id: string
  experimentId: string
  title: string
  scenario: string
  input: string
  output: string
  steps: string[]
  notes: string[]
  createdAt: string
}
