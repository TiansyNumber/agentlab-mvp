import { useState, useEffect } from 'react';
import { api, Runtime } from '../services/api';

interface Props {
  onBack: () => void;
  onSelectRuntime: (runtimeId: string, mode: string) => void;
  recentExperiments?: Array<{ id: string; name: string; runtime_id?: string; status: string }>;
}

function getStatusConfig(r: Runtime) {
  if (r.is_offline) return { label: '离线', color: '#6b7280', bg: '#f3f4f6', dot: '○', priority: 3 };
  if (r.is_busy)    return { label: '忙碌', color: '#d97706', bg: '#fef3c7', dot: '◉', priority: 1 };
  if (r.is_stale)   return { label: '不稳定', color: '#f59e0b', bg: '#fffbeb', dot: '◌', priority: 2 };
  return              { label: '在线', color: '#10b981', bg: '#d1fae5', dot: '●', priority: 0 };
}

function getLastSeen(heartbeat: string) {
  if (!heartbeat) return '未知';
  const diff = Date.now() - new Date(heartbeat).getTime();
  if (diff < 30000)   return '刚刚';
  if (diff < 60000)   return `${Math.floor(diff / 1000)}秒前`;
  if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`;
  return `${Math.floor(diff / 3600000)}小时前`;
}

function getModeLabel(mode: string) {
  return { demo: '🎭 Demo', simulated: '🔧 模拟', real: '🟢 真实设备' }[mode] || mode;
}

export default function RuntimeManager({ onBack, onSelectRuntime, recentExperiments = [] }: Props) {
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
        owner, type: 'openclaw', runtime_mode: mode,
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

  useEffect(() => { loadRuntimes(); }, []);

  const available = runtimes.filter(r => !r.is_offline).sort((a, b) => getStatusConfig(a).priority - getStatusConfig(b).priority);
  const offline   = runtimes.filter(r => r.is_offline);

  const RuntimeCard = ({ r, selectable }: { r: Runtime; selectable: boolean }) => {
    const cfg = getStatusConfig(r);
    const relatedExps = recentExperiments.filter(e => e.runtime_id === r.id).slice(0, 2);
    return (
      <div style={{
        border: selectable ? `2px solid ${cfg.color}40` : '1px solid #e5e7eb',
        borderTop: selectable ? `3px solid ${cfg.color}` : '1px solid #e5e7eb',
        borderRadius: 10,
        padding: 16,
        background: selectable ? 'white' : '#f9fafb',
        opacity: selectable ? 1 : 0.6,
        boxShadow: selectable ? '0 2px 8px rgba(0,0,0,0.07)' : 'none',
      }}>
        {/* 头部：状态 + 模式 */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#111827', marginBottom: 2 }}>{getModeLabel(r.mode)}</div>
            <div style={{ fontSize: 11, color: '#9ca3af', fontFamily: 'monospace' }}>{r.id.slice(0, 14)}…</div>
          </div>
          <span style={{ padding: '3px 10px', borderRadius: 12, fontSize: 12, fontWeight: 700, color: cfg.color, background: cfg.bg }}>
            {cfg.dot} {cfg.label}
          </span>
        </div>

        {/* 详情行 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12, color: '#4b5563', marginBottom: 12 }}>
          <div style={{ display: 'flex', gap: 16 }}>
            <span>最近心跳 <strong>{getLastSeen(r.last_heartbeat)}</strong></span>
            {r.last_seen_ms_ago != null && <span style={{ color: r.last_seen_ms_ago < 60000 ? '#10b981' : '#9ca3af' }}>
              {r.last_seen_ms_ago < 60000 ? '活跃' : `${Math.floor(r.last_seen_ms_ago / 60000)}分钟未活动`}
            </span>}
          </div>
          {r.is_busy && r.active_experiment_id && (
            <div style={{ padding: '5px 8px', background: '#fef3c7', borderRadius: 5, color: '#92400e', fontWeight: 600 }}>
              ⚙️ 正在执行实验 {r.active_experiment_id.slice(0, 10)}…
              {r.active_experiment_duration_ms != null && (
                <span style={{ fontWeight: 400, marginLeft: 6 }}>已运行 {Math.floor(r.active_experiment_duration_ms / 1000)}s</span>
              )}
            </div>
          )}
          {relatedExps.length > 0 && (
            <div style={{ padding: '6px 8px', background: '#eff6ff', borderRadius: 5, marginTop: 4 }}>
              <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 3 }}>最近实验</div>
              {relatedExps.map(exp => (
                <div key={exp.id} style={{ fontSize: 11, color: '#374151', display: 'flex', gap: 6, alignItems: 'center', marginBottom: 2 }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: exp.status === 'success' ? '#10b981' : exp.status === 'failed' ? '#ef4444' : '#3b82f6' }} />
                  <span>{exp.name.slice(0, 20)}{exp.name.length > 20 ? '…' : ''}</span>
                </div>
              ))}
            </div>
          )}
          {r.device_id && <div><span style={{ color: '#9ca3af' }}>Device:</span> {r.device_id.slice(0, 18)}…</div>}
          {r.gateway_url && <div><span style={{ color: '#9ca3af' }}>Gateway:</span> {(() => { try { return new URL(r.gateway_url!).host; } catch { return r.gateway_url; } })()}</div>}
          {r.capabilities?.length > 0 && (
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 2 }}>
              {r.capabilities.map(c => (
                <span key={c} style={{ padding: '1px 6px', background: '#f3f4f6', borderRadius: 3, fontSize: 11, color: '#374151' }}>{c}</span>
              ))}
            </div>
          )}
        </div>

        {selectable && (
          <button
            onClick={() => onSelectRuntime(r.id, r.mode)}
            disabled={r.is_busy}
            style={{
              width: '100%', padding: '7px', fontSize: 13, fontWeight: 600,
              background: r.is_busy ? '#e5e7eb' : cfg.color,
              color: r.is_busy ? '#9ca3af' : 'white',
              border: 'none', borderRadius: 6, cursor: r.is_busy ? 'not-allowed' : 'pointer',
            }}
          >
            {r.is_busy ? '忙碌中，不可选' : '使用此 Runtime'}
          </button>
        )}
      </div>
    );
  };

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto' }}>
      <button onClick={onBack} style={{ marginBottom: 16, padding: '6px 12px', border: '1px solid #d1d5db', borderRadius: 6, background: 'white', cursor: 'pointer' }}>← 返回</button>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>连接 OpenClaw Runtime</h2>
          <div style={{ fontSize: 13, color: '#6b7280', marginTop: 6, lineHeight: 1.6 }}>
            OpenClaw 是你的 Agent 执行环境。AgentLab 负责编排实验，OpenClaw 负责实际执行。<br/>
            连接后，你可以派发实验任务，观察执行过程，并在关键节点做出决策。
          </div>
        </div>
        <button onClick={loadRuntimes} disabled={loading} style={{ padding: '6px 14px', fontSize: 13, border: '1px solid #d1d5db', borderRadius: 6, cursor: 'pointer', background: 'white' }}>
          {loading ? '加载中…' : '🔄 刷新'}
        </button>
      </div>

      {/* 推荐方式 */}
      <div style={{ marginBottom: 24, border: '2px solid #10b981', padding: '20px 24px', borderRadius: 10, background: '#ecfdf5' }}>
        <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
          <div style={{ fontSize: 32, flexShrink: 0 }}>🚀</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#065f46', marginBottom: 6 }}>推荐方式：本地启动 Connector</div>
            <div style={{ fontSize: 13, color: '#047857', marginBottom: 12, lineHeight: 1.6 }}>
              Connector 会自动连接到 AgentLab 平台，注册为可用的 Runtime。<br/>
              无需手动配置 device_id 或 gateway_url，开箱即用。
            </div>
            <div style={{ background: '#1f2937', color: '#e5e7eb', padding: '10px 16px', borderRadius: 6, fontFamily: 'monospace', fontSize: 13, marginBottom: 10 }}>
              cd connector && npm start
            </div>
            <div style={{ fontSize: 12, color: '#059669' }}>
              💡 启动后，刷新此页面即可看到新注册的 Runtime
            </div>
          </div>
        </div>
      </div>

      {/* 可用 Runtime */}
      <div style={{ marginBottom: 12 }}>
        <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, marginBottom: 4 }}>
          可用 Runtime
          <span style={{ marginLeft: 8, fontSize: 13, fontWeight: 400, color: '#6b7280' }}>
            {available.length} 个（{available.filter(r => !r.is_busy).length} 空闲）
          </span>
        </h3>
        <div style={{ fontSize: 12, color: '#6b7280' }}>选择一个空闲的 Runtime 来执行你的实验</div>
      </div>

      {available.length === 0 ? (
        <div style={{ padding: '40px 28px', textAlign: 'center', color: '#6b7280', background: '#f9fafb', borderRadius: 10, border: '2px dashed #d1d5db', marginBottom: 24 }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🔌</div>
          <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 6, color: '#374151' }}>暂无可用 Runtime</div>
          <div style={{ fontSize: 13, marginBottom: 16 }}>请先启动 Connector，或使用下方高级选项手动注册</div>
          <button onClick={loadRuntimes} style={{ padding: '8px 20px', fontSize: 13, background: '#3b82f6', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 600 }}>
            🔄 刷新列表
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 14, marginBottom: 24 }}>
          {available.map(r => <RuntimeCard key={r.id} r={r} selectable={true} />)}
        </div>
      )}

      {/* 离线 Runtime */}
      {offline.length > 0 && (
        <>
          <h3 style={{ margin: '0 0 10px 0', fontSize: 14, fontWeight: 600, color: '#9ca3af' }}>离线 ({offline.length})</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 14, marginBottom: 24 }}>
            {offline.map(r => <RuntimeCard key={r.id} r={r} selectable={false} />)}
          </div>
        </>
      )}

      {/* 高级：手工注册 */}
      <div style={{ paddingTop: 20, borderTop: '1px solid #e5e7eb' }}>
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          style={{ padding: '6px 14px', fontSize: 13, color: '#6b7280', background: 'transparent', border: '1px solid #d1d5db', borderRadius: 6, cursor: 'pointer' }}
        >
          {showAdvanced ? '▼' : '▶'} 高级选项：手动注册 Runtime
        </button>
        {showAdvanced && (
          <div style={{ marginTop: 12, border: '1px solid #e5e7eb', padding: 16, borderRadius: 8, background: '#f9fafb' }}>
            <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 12, lineHeight: 1.5 }}>
              ⚠️ 仅在特殊场景使用（如远程设备、自定义网关）。推荐使用 Connector 自动连接。
            </div>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end' }}>
              <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <span style={{ fontSize: 12, fontWeight: 600 }}>Owner</span>
                <input value={owner} onChange={e => setOwner(e.target.value)} placeholder="default-user" style={{ padding: '5px 10px', border: '1px solid #d1d5db', borderRadius: 4, fontSize: 13 }} />
              </label>
              <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <span style={{ fontSize: 12, fontWeight: 600 }}>Mode</span>
                <select value={mode} onChange={e => setMode(e.target.value as any)} style={{ padding: '5px 10px', border: '1px solid #d1d5db', borderRadius: 4, fontSize: 13 }}>
                  <option value="demo">Demo（演示）</option>
                  <option value="simulated">Simulated（模拟）</option>
                  <option value="real">Real（真实设备）</option>
                </select>
              </label>
              {mode === 'real' && (
                <>
                  <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <span style={{ fontSize: 12, fontWeight: 600 }}>Device ID</span>
                    <input value={deviceId} onChange={e => setDeviceId(e.target.value)} placeholder="device-xxx" style={{ padding: '5px 10px', border: '1px solid #d1d5db', borderRadius: 4, width: 150, fontSize: 13 }} />
                  </label>
                  <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <span style={{ fontSize: 12, fontWeight: 600 }}>Gateway URL</span>
                    <input value={gatewayUrl} onChange={e => setGatewayUrl(e.target.value)} placeholder="https://gateway.openclaw.ai" style={{ padding: '5px 10px', border: '1px solid #d1d5db', borderRadius: 4, width: 250, fontSize: 13 }} />
                  </label>
                </>
              )}
              <button onClick={handleRegister} disabled={loading} style={{ padding: '6px 18px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>注册</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
