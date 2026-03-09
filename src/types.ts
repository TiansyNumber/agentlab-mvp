export interface Experiment {
  id: string
  name: string
  status: 'running' | 'paused' | 'completed'
  createdAt: string
  events: Event[]
}

export interface Event {
  id: string
  timestamp: string
  type: 'start' | 'action' | 'intervention' | 'complete'
  message: string
}
