/**
 * RunnerFactory
 *
 * 根据 runnerType 创建对应的 runner 实例。
 */
import { IExperimentRunner } from './types'
import { MockRunner } from './MockRunner'
import { AnthropicRunner } from './AnthropicRunner'
import { OpenClawBrowserBridge } from './OpenClawBrowserBridge'

export type RunnerType = 'mock' | 'anthropic' | 'openclaw-bridge'

export function createRunner(type: RunnerType): IExperimentRunner {
  switch (type) {
    case 'mock':
      return new MockRunner()
    case 'anthropic':
      return new AnthropicRunner()
    case 'openclaw-bridge':
      return new OpenClawBrowserBridge()
    default:
      return new MockRunner()
  }
}
