import { Event } from '../types'

export function createEvent(type: Event['type'], message: string): Event {
  return {
    id: Date.now().toString() + Math.random(),
    timestamp: new Date().toLocaleTimeString(),
    type,
    message
  }
}
