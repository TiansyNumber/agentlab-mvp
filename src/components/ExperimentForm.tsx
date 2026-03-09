import { useState } from 'react'

interface FormData {
  name: string
  description: string
  successCriteria: string
  failureConditions: string
  model: string
  tools: string[]
  maxSteps: number
  maxTokens: number
  maxDuration: number
}

interface Props {
  onSubmit: (data: FormData) => void
  onCancel: () => void
}

const AVAILABLE_TOOLS = ['read', 'write', 'bash', 'search']
const MODELS = ['claude-sonnet-4', 'claude-opus-4', 'gpt-4']

export default function ExperimentForm({ onSubmit, onCancel }: Props) {
  const [data, setData] = useState<FormData>({
    name: '',
    description: '',
    successCriteria: '',
    failureConditions: '',
    model: 'claude-sonnet-4',
    tools: [],
    maxSteps: 50,
    maxTokens: 100000,
    maxDuration: 3600
  })

  const toggleTool = (tool: string) => {
    setData(prev => ({
      ...prev,
      tools: prev.tools.includes(tool)
        ? prev.tools.filter(t => t !== tool)
        : [...prev.tools, tool]
    }))
  }

  const isValid = data.name && data.description && data.successCriteria

  return (
    <div style={{ maxWidth: '600px' }}>
      <h2>创建实验</h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <input
          type="text"
          value={data.name}
          onChange={e => setData({ ...data, name: e.target.value })}
          placeholder="实验名称"
          style={{ padding: '8px' }}
        />
        <textarea
          value={data.description}
          onChange={e => setData({ ...data, description: e.target.value })}
          placeholder="任务描述"
          rows={3}
          style={{ padding: '8px' }}
        />
        <textarea
          value={data.successCriteria}
          onChange={e => setData({ ...data, successCriteria: e.target.value })}
          placeholder="成功标准"
          rows={2}
          style={{ padding: '8px' }}
        />
        <textarea
          value={data.failureConditions}
          onChange={e => setData({ ...data, failureConditions: e.target.value })}
          placeholder="失败条件"
          rows={2}
          style={{ padding: '8px' }}
        />
        <select value={data.model} onChange={e => setData({ ...data, model: e.target.value })} style={{ padding: '8px' }}>
          {MODELS.map(m => <option key={m} value={m}>{m}</option>)}
        </select>
        <div>
          <label>工具权限:</label>
          {AVAILABLE_TOOLS.map(tool => (
            <label key={tool} style={{ marginLeft: '10px' }}>
              <input type="checkbox" checked={data.tools.includes(tool)} onChange={() => toggleTool(tool)} />
              {tool}
            </label>
          ))}
        </div>
        <input
          type="number"
          value={data.maxSteps}
          onChange={e => setData({ ...data, maxSteps: Number(e.target.value) })}
          placeholder="最大步数"
          style={{ padding: '8px' }}
        />
        <input
          type="number"
          value={data.maxTokens}
          onChange={e => setData({ ...data, maxTokens: Number(e.target.value) })}
          placeholder="最大Token"
          style={{ padding: '8px' }}
        />
        <input
          type="number"
          value={data.maxDuration}
          onChange={e => setData({ ...data, maxDuration: Number(e.target.value) })}
          placeholder="最大时长(秒)"
          style={{ padding: '8px' }}
        />
        <div>
          <button onClick={() => onSubmit(data)} disabled={!isValid}>创建</button>
          <button onClick={onCancel} style={{ marginLeft: '10px' }}>取消</button>
        </div>
      </div>
    </div>
  )
}
