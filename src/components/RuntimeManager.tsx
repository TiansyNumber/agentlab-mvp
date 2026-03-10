import { useState, useEffect } from 'react';
import { api, Runtime } from '../services/api';

interface Props {
  onBack: () => void;
  onSelectRuntime: (runtimeId: string, mode: string) => void;
  selectedRuntimeId?: string;
}

export default function RuntimeManager({ onBack, onSelectRuntime, selectedRuntimeId }: Props) {
  const [runtimes, setRuntimes] = useState<Runtime[]>([]);
  const [owner, setOwner] = useState('default-user');
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<'demo' | 'simulated' | 'real'>('demo');
  const [deviceId, setDeviceId] = useState('');
  const [gatewayUrl, setGatewayUrl] = useState('');

  const loadRuntimes = async () => {
    setLoading(true);
    try {
      const data = await api.listRuntimes();
      setRuntimes(data);
    } catch (err) {
      alert('加载 runtime 失败: ' + (err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    if (mode === 'real' && (!deviceId.trim() || !gatewayUrl.trim())) {
      alert('Real runtime 需要 device_id 和 gateway_url');
      return;
    }
    setLoading(true);
    try {
      await api.registerRuntime({
        owner,
        type: 'openclaw',
        runtime_mode: mode,
        capabilities: ['web-browsing', 'code-execution'],
        device_id: mode === 'real' ? deviceId : undefined,
        gateway_url: mode === 'real' ? gatewayUrl : undefined,
      });
      await loadRuntimes();
    } catch (err) {
      alert('注册 runtime 失败: ' + (err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRuntimes();
  }, []);

  const getModeLabel = (m: string) => {
    const labels: Record<string, string> = { demo: '🎭 Demo', simulated: '🔧 Simulated', real: '🟢 Real (CLI)' };
    return labels[m] || m;
  };

  const online = runtimes.filter(r => r.status === 'online');
  const offline = runtimes.filter(r => r.status !== 'online');

  return (
    <div>
      <button onClick={onBack}>← 返回</button>
      <h2>Runtime 管理中心</h2>

      <div style={{ display: 'flex', gap: '20px', marginBottom: '20px', padding: '12px 16px', backgroundColor: '#f5f5f5', borderRadius: '6px' }}>
        <span style={{ color: '#4CAF50', fontWeight: 'bold' }}>● 在线: {online.length}</span>
        <span style={{ color: '#999' }}>○ 离线: {offline.length}</span>
        <span style={{ color: '#2196F3' }}>Real: {runtimes.filter(r => r.mode === 'real').length}</span>
        <span style={{ color: '#888' }}>Simulated: {runtimes.filter(r => r.mode === 'simulated').length}</span>
        <span style={{ color: '#888' }}>Demo: {runtimes.filter(r => r.mode === 'demo').length}</span>
      </div>

      {loading ? <p>加载中...</p> : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '12px', marginBottom: '24px' }}>
          {runtimes.map(r => {
            const isSelected = r.id === selectedRuntimeId;
            const isOnline = r.status === 'online';
            return (
              <div key={r.id} style={{
                border: isSelected ? '2px solid #2196F3' : `2px solid ${r.mode === 'real' ? '#4CAF50' : '#ddd'}`,
                borderRadius: '8px',
                padding: '14px',
                backgroundColor: isSelected ? '#e3f2fd' : (isOnline ? '#fafafa' : '#f5f5f5'),
                opacity: isOnline ? 1 : 0.7,
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <strong>{getModeLabel(r.mode)}</strong>
                  <span style={{
                    backgroundColor: isOnline ? '#4CAF50' : '#999',
                    color: 'white',
                    padding: '2px 8px',
                    borderRadius: '12px',
                    fontSize: '0.8em',
                  }}>{r.status}</span>
                </div>
                <div style={{ fontSize: '0.85em', color: '#666', lineHeight: '1.6', marginBottom: '10px' }}>
                  <div><span style={{ color: '#999' }}>ID:</span> {r.id.slice(0, 14)}...</div>
                  <div><span style={{ color: '#999' }}>Owner:</span> {r.owner}</div>
                  {r.device_id && <div><span style={{ color: '#999' }}>Device:</span> {r.device_id.slice(0, 16)}...</div>}
                  {r.gateway_url && <div><span style={{ color: '#999' }}>Gateway:</span> {(() => { try { return new URL(r.gateway_url!).host; } catch { return r.gateway_url; } })()}</div>}
                </div>
                {isSelected && <div style={{ fontSize: '0.85em', color: '#2196F3', marginBottom: '8px', fontWeight: 'bold' }}>✓ 当前选中</div>}
                <button
                  onClick={() => onSelectRuntime(r.id, r.mode)}
                  disabled={!isOnline}
                  style={{
                    width: '100%',
                    backgroundColor: isSelected ? '#1565C0' : (isOnline ? '#2196F3' : '#ccc'),
                    color: 'white',
                    border: 'none',
                    padding: '7px',
                    borderRadius: '4px',
                    cursor: isOnline ? 'pointer' : 'not-allowed',
                    fontSize: '0.9em',
                  }}
                >{isSelected ? '已选中' : '选择此 Runtime'}</button>
              </div>
            );
          })}
        </div>
      )}

      <div style={{ marginBottom: '10px' }}>
        <button onClick={loadRuntimes} disabled={loading} style={{ marginRight: '10px' }}>刷新列表</button>
      </div>

      <div style={{ marginTop: '20px', border: '1px solid #ddd', padding: '16px', borderRadius: '6px' }}>
        <h3 style={{ marginTop: 0 }}>注册新 Runtime</h3>
        <div style={{ marginBottom: 10 }}>
          <label>Owner: </label>
          <input value={owner} onChange={e => setOwner(e.target.value)} placeholder="Owner" />
        </div>
        <div style={{ marginBottom: 10 }}>
          <label>Mode: </label>
          <select value={mode} onChange={e => setMode(e.target.value as any)}>
            <option value="demo">Demo (纯演示)</option>
            <option value="simulated">Simulated (模拟 OpenClaw)</option>
            <option value="real">Real (真实 OpenClaw Gateway)</option>
          </select>
        </div>
        {mode === 'real' && (
          <>
            <div style={{ marginBottom: 10 }}>
              <label>Device ID: </label>
              <input value={deviceId} onChange={e => setDeviceId(e.target.value)} placeholder="device-xxx" />
            </div>
            <div style={{ marginBottom: 10 }}>
              <label>Gateway URL: </label>
              <input value={gatewayUrl} onChange={e => setGatewayUrl(e.target.value)} placeholder="https://gateway.openclaw.ai" style={{ width: 300 }} />
            </div>
          </>
        )}
        <button onClick={handleRegister} disabled={loading}>注册 Runtime</button>
      </div>
    </div>
  );
}
