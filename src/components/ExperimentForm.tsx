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
  selectedRuntimeId?: string
  selectedRuntimeMode?: string
}

const AVAILABLE_TOOLS = ['read', 'write', 'bash', 'search']
const MODELS = ['claude-sonnet-4', 'claude-opus-4', 'gpt-4']

export default function ExperimentForm({ onSubmit, onCancel, selectedRuntimeId, selectedRuntimeMode }: Props) {
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

  const isValid = data.name.trim() !== '' && data.description.trim() !== '' && data.successCriteria.trim() !== ''

  return (
    <div style={{ maxWidth: '600px' }}>
      <h2>创建实验</h2>
      {selectedRuntimeId && (
        <div style={{ padding: '12px 16px', background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: 8, marginBottom: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#065f46', marginBottom: 4 }}>✓ 已选择 Runtime</div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 12, color: '#047857' }}>
            <span style={{ fontFamily: 'monospace' }}>{selectedRuntimeId.slice(0, 12)}...</span>
            <span style={{ padding: '2px 8px', background: selectedRuntimeMode === 'real' ? '#d1fae5' : '#f3f4f6', borderRadius: 4, fontWeight: 600, color: selectedRuntimeMode === 'real' ? '#065f46' : '#374151' }}>
              {selectedRuntimeMode === 'real' ? '🟢 真实设备' : selectedRuntimeMode === 'simulated' ? '🔧 模拟' : '🎭 Demo'}
            </span>
          </div>
        </div>
      )}
      {!selectedRuntimeId && (
        <div style={{ padding: '12px 16px', background: '#fef3c7', border: '1px solid #fcd34d', borderRadius: 8, marginBottom: 16 }}>
          <div style={{ fontSize: 13, color: '#92400e' }}>⚠️ 未选择 Runtime，创建后需要手动连接</div>
        </div>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <input
          type="text"
          value={data.name}
          onChange={e => setData(prev => ({ ...prev, name: e.target.value }))}
          placeholder="实验名称 *"
          style={{ padding: '8px' }}
        />
        <textarea
          value={data.description}
          onChange={e => setData(prev => ({ ...prev, description: e.target.value }))}
          placeholder="任务描述 *"
          rows={3}
          style={{ padding: '8px' }}
        />
        <textarea
          value={data.successCriteria}
          onChange={e => setData(prev => ({ ...prev, successCriteria: e.target.value }))}
          placeholder="成功标准 *"
          rows={2}
          style={{ padding: '8px' }}
        />
        <textarea
          value={data.failureConditions}
          onChange={e => setData(prev => ({ ...prev, failureConditions: e.target.value }))}
          placeholder="失败条件"
          rows={2}
          style={{ padding: '8px' }}
        />
        <select value={data.model} onChange={e => setData(prev => ({ ...prev, model: e.target.value }))} style={{ padding: '8px' }}>
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
          onChange={e => setData(prev => ({ ...prev, maxSteps: Number(e.target.value) }))}
          placeholder="最大步数"
          style={{ padding: '8px' }}
        />
        <input
          type="number"
          value={data.maxTokens}
          onChange={e => setData(prev => ({ ...prev, maxTokens: Number(e.target.value) }))}
          placeholder="最大Token"
          style={{ padding: '8px' }}
        />
        <input
          type="number"
          value={data.maxDuration}
          onChange={e => setData(prev => ({ ...prev, maxDuration: Number(e.target.value) }))}
          placeholder="最大时长(秒)"
          style={{ padding: '8px' }}
        />
        <div>
          <button
            onClick={() => onSubmit(data)}
            disabled={!isValid}
            style={{
              padding: '8px 16px',
              backgroundColor: isValid ? '#2196F3' : '#ccc',
              color: isValid ? 'white' : '#666',
              border: 'none',
              borderRadius: '4px',
              cursor: isValid ? 'pointer' : 'not-allowed'
            }}
          >
            创建
          </button>
          <button onClick={onCancel} style={{ marginLeft: '10px', padding: '8px 16px' }}>取消</button>
        </div>
        {!isValid && (
          <p style={{ color: '#999', fontSize: '0.85em', margin: 0 }}>* 请填写实验名称、任务描述和成功标准</p>
        )}
      </div>
    </div>
  )
}
