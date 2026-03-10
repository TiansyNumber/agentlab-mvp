import { useState, useEffect } from 'react';
import { api, Runtime } from '../services/api';

interface Props {
  onBack: () => void;
  onSelectRuntime: (runtimeId: string, mode: string) => void;
}

export default function RuntimeManager({ onBack, onSelectRuntime }: Props) {
  const [runtimes, setRuntimes] = useState<Runtime[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [owner, setOwner] = useState('default-user');
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

  const getStatusBadge = (status: string) => {
    const badges = {
      online: { label: '在线', color: '#10b981', bg: '#d1fae5' },
      idle: { label: '空闲', color: '#3b82f6', bg: '#dbeafe' },
      busy: { label: '忙碌', color: '#f59e0b', bg: '#fef3c7' },
      stale: { label: '不稳定', color: '#f59e0b', bg: '#fef3c7' },
      reconnecting: { label: '重连中', color: '#f59e0b', bg: '#fef3c7' },
      offline: { label: '离线', color: '#6b7280', bg: '#f3f4f6' }
    };
    const badge = badges[status as keyof typeof badges] || badges.offline;
    return <span style={{ padding: '2px 8px', borderRadius: 4, fontSize: 12, fontWeight: 600, color: badge.color, background: badge.bg }}>{badge.label}</span>;
  };

  const getLastSeen = (heartbeat: string) => {
    if (!heartbeat) return '未知';
    const diff = Date.now() - new Date(heartbeat).getTime();
    if (diff < 60000) return '刚刚';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`;
    return `${Math.floor(diff / 3600000)}小时前`;
  };

  const connectedRuntimes = runtimes.filter(r => r.status === 'online');
  const otherRuntimes = runtimes.filter(r => r.status !== 'online');

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto' }}>
      <button onClick={onBack}>← 返回</button>
      <h2>连接 OpenClaw</h2>

      <div style={{ marginBottom: 20, border: '2px solid #10b981', padding: 20, borderRadius: 8, background: '#ecfdf5' }}>
        <h3 style={{ margin: '0 0 8px 0', fontSize: 18, color: '#065f46' }}>🔗 启动 Connector 自动连接</h3>
        <p style={{ margin: '0 0 12px 0', fontSize: 13, color: '#047857' }}>
          推荐方式：在本地运行 connector，自动连接到平台，无需手工配置
        </p>
        <div style={{ background: '#1f2937', color: '#e5e7eb', padding: 12, borderRadius: 6, fontFamily: 'monospace', fontSize: 13 }}>
          cd connector && npm start
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <h3 style={{ margin: 0, fontSize: 16 }}>已连接的 OpenClaw ({connectedRuntimes.length})</h3>
        <button onClick={loadRuntimes} disabled={loading} style={{ padding: '4px 12px', fontSize: 13 }}>🔄 刷新</button>
      </div>

      {loading ? <p>加载中...</p> : (
        <>
          {connectedRuntimes.length > 0 ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16, marginBottom: 24 }}>
              {connectedRuntimes.map(r => (
                <div key={r.id} style={{
                  border: '2px solid #10b981',
                  borderRadius: 8,
                  padding: 16,
                  background: '#ecfdf5',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                    <div>
                      <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 4 }}>ID: {r.id.slice(0, 12)}...</div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: '#065f46' }}>🟢 {r.mode === 'real' ? 'Real Runtime' : r.mode.toUpperCase()}</div>
                    </div>
                    {getStatusBadge(r.status)}
                  </div>

                  <div style={{ fontSize: 12, color: '#047857', marginBottom: 8, display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {r.device_id && <div><strong>Device:</strong> {r.device_id.slice(0, 16)}...</div>}
                    {r.gateway_url && <div><strong>Gateway:</strong> {(() => { try { return new URL(r.gateway_url!).host; } catch { return r.gateway_url; } })()}</div>}
                    <div><strong>Last Seen:</strong> {getLastSeen(r.last_heartbeat)}</div>
                  </div>

                  <button
                    onClick={() => onSelectRuntime(r.id, r.mode)}
                    style={{
                      width: '100%',
                      padding: '6px',
                      background: '#10b981',
                      color: 'white',
                      border: 'none',
                      borderRadius: 4,
                      cursor: 'pointer',
                      fontWeight: 600,
                      fontSize: 13
                    }}
                  >
                    使用此连接
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ padding: 20, textAlign: 'center', color: '#6b7280', background: '#f9fafb', borderRadius: 8, marginBottom: 24 }}>
              暂无已连接的 OpenClaw，请运行上方命令启动 connector
            </div>
          )}

          {otherRuntimes.length > 0 && (
            <>
              <h3 style={{ margin: '24px 0 12px 0', fontSize: 16, color: '#6b7280' }}>其他 Runtime ({otherRuntimes.length})</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
                {otherRuntimes.map(r => (
                  <div key={r.id} style={{
                    border: '1px solid #e5e7eb',
                    borderRadius: 8,
                    padding: 16,
                    background: 'white',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                    opacity: 0.7
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                      <div>
                        <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 4 }}>ID: {r.id.slice(0, 12)}...</div>
                        <div style={{ fontSize: 14, fontWeight: 700, color: '#111827' }}>{r.mode.toUpperCase()}</div>
                      </div>
                      {getStatusBadge(r.status)}
                    </div>

                    <div style={{ fontSize: 12, color: '#4b5563', marginBottom: 8, display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <div><strong>Owner:</strong> {r.owner}</div>
                      {r.device_id && <div><strong>Device:</strong> {r.device_id.slice(0, 16)}...</div>}
                      <div><strong>Last Seen:</strong> {getLastSeen(r.last_heartbeat)}</div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          <div style={{ marginTop: 32, paddingTop: 24, borderTop: '1px solid #e5e7eb' }}>
            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              style={{ padding: '6px 12px', fontSize: 13, color: '#6b7280', background: 'transparent', border: '1px solid #d1d5db', borderRadius: 4, cursor: 'pointer' }}
            >
              {showAdvanced ? '▼' : '▶'} 高级：手工注册 Runtime
            </button>

            {showAdvanced && (
              <div style={{ marginTop: 12, border: '1px solid #e5e7eb', padding: 16, borderRadius: 8, background: '#f9fafb' }}>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end' }}>
                  <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <span style={{ fontSize: 12, fontWeight: 600 }}>Owner</span>
                    <input value={owner} onChange={e => setOwner(e.target.value)} placeholder="Owner" style={{ padding: '4px 8px', border: '1px solid #d1d5db', borderRadius: 4 }} />
                  </label>
                  <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <span style={{ fontSize: 12, fontWeight: 600 }}>Mode</span>
                    <select value={mode} onChange={e => setMode(e.target.value as any)} style={{ padding: '4px 8px', border: '1px solid #d1d5db', borderRadius: 4 }}>
                      <option value="demo">Demo</option>
                      <option value="simulated">Simulated</option>
                      <option value="real">Real</option>
                    </select>
                  </label>
                  {mode === 'real' && (
                    <>
                      <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        <span style={{ fontSize: 12, fontWeight: 600 }}>Device ID</span>
                        <input value={deviceId} onChange={e => setDeviceId(e.target.value)} placeholder="device-xxx" style={{ padding: '4px 8px', border: '1px solid #d1d5db', borderRadius: 4, width: 150 }} />
                      </label>
                      <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        <span style={{ fontSize: 12, fontWeight: 600 }}>Gateway URL</span>
                        <input value={gatewayUrl} onChange={e => setGatewayUrl(e.target.value)} placeholder="https://gateway.openclaw.ai" style={{ padding: '4px 8px', border: '1px solid #d1d5db', borderRadius: 4, width: 250 }} />
                      </label>
                    </>
                  )}
                  <button onClick={handleRegister} disabled={loading} style={{ padding: '5px 16px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer', fontWeight: 600 }}>注册</button>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
