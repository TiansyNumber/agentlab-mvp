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
  const [copied, setCopied] = useState(false);
  const [showTroubleshooting, setShowTroubleshooting] = useState(false);

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

  const copyCommands = () => {
    const commands = 'cd connector\nnpm install\nnpm start';
    navigator.clipboard.writeText(commands);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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

      {/* Step-by-step 接入向导 */}
      <div style={{ marginBottom: 24, border: '2px solid #10b981', borderRadius: 10, background: '#ecfdf5', overflow: 'hidden' }}>
        <div style={{ padding: '16px 24px', background: '#059669', color: 'white', display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 28 }}>🚀</span>
          <div>
            <div style={{ fontSize: 17, fontWeight: 700 }}>OpenClaw 接入向导</div>
            <div style={{ fontSize: 12, opacity: 0.9 }}>跟随步骤完成接入，5 分钟内开始你的第一个实验</div>
          </div>
        </div>

        <div style={{ padding: '20px 24px' }}>
          {/* Step 0 */}
          <div style={{ marginBottom: 16, paddingBottom: 16, borderBottom: '1px solid #d1fae5' }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#065f46', marginBottom: 6 }}>📋 Step 0: 准备工作</div>
            <div style={{ fontSize: 13, color: '#047857', lineHeight: 1.6 }}>
              • 确保 OpenClaw Gateway 已启动（默认监听 <code style={{ background: '#d1fae5', padding: '2px 6px', borderRadius: 3, fontFamily: 'monospace' }}>ws://localhost:18889</code>）<br/>
              • 确保你在 AgentLab 项目根目录
            </div>
          </div>

          {/* Step 1-3 */}
          <div style={{ marginBottom: 16, paddingBottom: 16, borderBottom: '1px solid #d1fae5' }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#065f46', marginBottom: 6 }}>⚙️ Step 1-3: 启动 Connector</div>
            <div style={{ fontSize: 13, color: '#047857', marginBottom: 10 }}>在终端执行以下命令：</div>
            <div style={{ position: 'relative' }}>
              <div style={{ background: '#1f2937', color: '#e5e7eb', padding: '12px 16px', borderRadius: 6, fontFamily: 'monospace', fontSize: 13, lineHeight: 1.8 }}>
                cd connector<br/>
                npm install<br/>
                npm start
              </div>
              <button
                onClick={copyCommands}
                style={{
                  position: 'absolute',
                  top: 8,
                  right: 8,
                  padding: '4px 10px',
                  fontSize: 12,
                  background: copied ? '#10b981' : '#374151',
                  color: 'white',
                  border: 'none',
                  borderRadius: 4,
                  cursor: 'pointer',
                  fontWeight: 600
                }}
              >
                {copied ? '✓ 已复制' : '📋 复制'}
              </button>
            </div>
            <div style={{ fontSize: 12, color: '#059669', marginTop: 8 }}>
              💡 Connector 会自动连接到 AgentLab，无需手动配置
            </div>
          </div>

          {/* Step 4 */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#065f46', marginBottom: 8 }}>🔄 Step 4: 刷新并查看 Runtime</div>
            <button
              onClick={loadRuntimes}
              disabled={loading}
              style={{
                padding: '8px 20px',
                fontSize: 14,
                fontWeight: 600,
                background: '#10b981',
                color: 'white',
                border: 'none',
                borderRadius: 6,
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.6 : 1
              }}
            >
              {loading ? '刷新中…' : '🔄 刷新 Runtime 列表'}
            </button>
            <div style={{ fontSize: 12, color: '#047857', marginTop: 6 }}>
              启动成功后，点击刷新即可看到新注册的 Runtime 出现在下方列表
            </div>
          </div>

          {/* 排障 */}
          <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid #d1fae5' }}>
            <button
              onClick={() => setShowTroubleshooting(!showTroubleshooting)}
              style={{
                padding: '6px 12px',
                fontSize: 13,
                color: '#047857',
                background: 'transparent',
                border: '1px solid #10b981',
                borderRadius: 6,
                cursor: 'pointer',
                fontWeight: 600
              }}
            >
              {showTroubleshooting ? '▼' : '▶'} 看不到 Runtime？点击查看排障
            </button>
            {showTroubleshooting && (
              <div style={{ marginTop: 12, padding: 12, background: '#d1fae5', borderRadius: 6, fontSize: 12, color: '#065f46', lineHeight: 1.7 }}>
                <strong>常见问题：</strong><br/>
                • <strong>Gateway 未启动</strong>：确认 OpenClaw Gateway 在 18889 端口运行<br/>
                • <strong>Connector 未启动</strong>：检查终端是否有报错，确认 npm start 成功<br/>
                • <strong>Backend 不可达</strong>：确认 AgentLab backend 服务正常（默认 localhost:3001）<br/>
                • <strong>端口冲突</strong>：检查 18889 (Gateway) 和 3001 (Backend) 端口是否被占用<br/>
                • <strong>网络问题</strong>：确认 WebSocket 连接未被防火墙拦截
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 接上后怎么用 */}
      <div style={{ marginBottom: 24, border: '1px solid #3b82f6', borderRadius: 10, background: '#eff6ff', padding: '16px 20px' }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: '#1e40af', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
          <span>✨</span> 接入成功后，你可以这样使用
        </div>
        <div style={{ fontSize: 13, color: '#1e40af', lineHeight: 1.8 }}>
          <strong>1.</strong> 在下方列表选择一个空闲的 Runtime<br/>
          <strong>2.</strong> 创建实验，配置任务目标和参数<br/>
          <strong>3.</strong> 观察实验执行过程（实时日志、截图、状态）<br/>
          <strong>4.</strong> 当实验进入 <code style={{ background: '#dbeafe', padding: '2px 6px', borderRadius: 3, fontFamily: 'monospace' }}>needs_human</code> 状态时，查看 Agent 的请求并做出决策<br/>
          <strong>5.</strong> 实验完成后，查看结果和完整执行记录
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
