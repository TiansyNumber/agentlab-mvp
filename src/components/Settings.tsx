import { useState, useEffect } from 'react'

interface SettingsProps {
  onBack: () => void
}

export default function Settings({ onBack }: SettingsProps) {
  const [apiKey, setApiKey] = useState('')
  const [gatewayUrl, setGatewayUrl] = useState('')
  const [gatewayToken, setGatewayToken] = useState('')

  useEffect(() => {
    setApiKey(localStorage.getItem('anthropic_api_key') || '')
    setGatewayUrl(localStorage.getItem('openclaw_gateway_url') || 'ws://localhost:19889')
    setGatewayToken(localStorage.getItem('openclaw_gateway_token') || '')
  }, [])

  const handleSave = () => {
    localStorage.setItem('anthropic_api_key', apiKey)
    localStorage.setItem('openclaw_gateway_url', gatewayUrl)
    localStorage.setItem('openclaw_gateway_token', gatewayToken)
    alert('设置已保存')
  }

  return (
    <div>
      <h2>设置</h2>

      <h3>Anthropic Runner</h3>
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
      </div>

      <h3>OpenClaw Runner</h3>
      <div style={{ marginBottom: '10px' }}>
        <label style={{ display: 'block', marginBottom: '5px' }}>
          Gateway URL（默认 ws://localhost:19889）:
        </label>
        <input
          type="text"
          value={gatewayUrl}
          onChange={(e) => setGatewayUrl(e.target.value)}
          placeholder="ws://localhost:19889"
          style={{ width: '400px', padding: '5px' }}
        />
      </div>
      <div style={{ marginBottom: '20px' }}>
        <label style={{ display: 'block', marginBottom: '5px' }}>
          Gateway Token（运行 <code>openclaw config get gateway.auth</code> 获取）:
        </label>
        <input
          type="password"
          value={gatewayToken}
          onChange={(e) => setGatewayToken(e.target.value)}
          placeholder="your-gateway-token"
          style={{ width: '400px', padding: '5px' }}
        />
      </div>

      <button onClick={handleSave} style={{ marginRight: '10px' }}>保存</button>
      <button onClick={onBack}>返回</button>
    </div>
  )
}
