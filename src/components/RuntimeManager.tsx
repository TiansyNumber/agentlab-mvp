import { useState, useEffect } from 'react';
import { api, Runtime } from '../services/api';

interface Props {
  onBack: () => void;
  onSelectRuntime: (runtimeId: string) => void;
}

export default function RuntimeManager({ onBack, onSelectRuntime }: Props) {
  const [runtimes, setRuntimes] = useState<Runtime[]>([]);
  const [owner, setOwner] = useState('default-user');
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<'demo' | 'simulated' | 'real'>('demo');
  const [deviceId, setDeviceId] = useState('');
  const [gatewayUrl, setGatewayUrl] = useState('');

  const loadRuntimes = async () => {
    setLoading(true);
    try {
      const data = await api.listRuntimes(owner);
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

  return (
    <div>
      <button onClick={onBack}>← 返回</button>
      <h2>Runtime 管理</h2>
      <div style={{ marginBottom: 20, border: '1px solid #ccc', padding: 10 }}>
        <h3>注册新 Runtime</h3>
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
      <div style={{ marginBottom: 10 }}>
        <button onClick={loadRuntimes} disabled={loading}>刷新列表</button>
      </div>
      {loading ? <p>加载中...</p> : (
        <table border={1} style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th>ID</th>
              <th>Owner</th>
              <th>Type</th>
              <th>Mode</th>
              <th>Status</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {runtimes.map(r => (
              <tr key={r.id}>
                <td>{r.id}</td>
                <td>{r.owner}</td>
                <td>{r.type}</td>
                <td>{r.mode}</td>
                <td>{r.status}</td>
                <td><button onClick={() => onSelectRuntime(r.id)}>选择</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
