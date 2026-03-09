import { useState, useEffect } from 'react'

interface SettingsProps {
  onBack: () => void
}

export default function Settings({ onBack }: SettingsProps) {
  const [apiKey, setApiKey] = useState('')

  useEffect(() => {
    setApiKey(localStorage.getItem('anthropic_api_key') || '')
  }, [])

  const handleSave = () => {
    localStorage.setItem('anthropic_api_key', apiKey)
    alert('API Key 已保存')
  }

  return (
    <div>
      <h2>设置</h2>
      <div style={{ marginBottom: '20px' }}>
        <label style={{ display: 'block', marginBottom: '5px' }}>
          Anthropic API Key:
        </label>
        <input
          type="password"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          placeholder="sk-ant-..."
          style={{ width: '400px', padding: '5px' }}
        />
        <button onClick={handleSave} style={{ marginLeft: '10px' }}>保存</button>
      </div>
      <button onClick={onBack}>返回</button>
    </div>
  )
}
