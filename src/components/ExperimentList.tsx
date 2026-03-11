import { Experiment } from '../types'

interface Props {
  experiments: Experiment[]
  onSelect: (id: string) => void
  onCreate: () => void
  runtimes?: Array<{ id: string; mode: string; status: string }>
}

const statusConfig: Record<string, { label: string; color: string; bg: string; dot: string }> = {
  draft:   { label: '待执行', color: '#92400e', bg: '#fef3c7', dot: '○' },
  running: { label: '执行中', color: '#1d4ed8', bg: '#dbeafe', dot: '●' },
  paused:  { label: '已暂停', color: '#c2410c', bg: '#ffedd5', dot: '⏸' },
  success: { label: '已完成', color: '#065f46', bg: '#d1fae5', dot: '✓' },
  failed:  { label: '失败',   color: '#991b1b', bg: '#fee2e2', dot: '✖' },
  needs_human: { label: '需要决策', color: '#7c2d12', bg: '#fed7aa', dot: '👋' },
}

function getPhaseLabel(phase?: string) {
  const map: Record<string, string> = {
    connecting: '连接中', connected: '已连接', authenticating: '认证中',
    authenticated: '已认证', command_sent: '命令已发', action_received: '收到 Action',
    execution_running: '执行中', execution_completed: '执行完成', execution_failed: '执行失败',
  }
  return phase ? (map[phase] || phase) : null
}

export default function ExperimentList({ experiments, onSelect, onCreate, runtimes = [] }: Props) {
  const getRuntimeInfo = (runtimeId?: string) => runtimes.find(r => r.id === runtimeId)

  const pending   = experiments.filter(e => e.status === 'draft')
  const running   = experiments.filter(e => e.status === 'running' || e.status === 'paused' || e.status === 'needs_human')
  const completed = experiments.filter(e => e.status === 'success' || e.status === 'failed')

  const ExperimentCard = ({ exp }: { exp: Experiment }) => {
    const cfg = statusConfig[exp.status] || statusConfig.draft
    const runtime = getRuntimeInfo(exp.runtime_id)
    const phaseLabel = getPhaseLabel(exp.phase)
    const summary = exp.execution_summary
    const isRunning = exp.status === 'running'

    return (
      <div
        onClick={() => onSelect(exp.id)}
        style={{
          padding: '14px 16px',
          border: `1px solid ${cfg.color}30`,
          borderLeft: `4px solid ${cfg.color}`,
          borderRadius: 8,
          cursor: 'pointer',
          background: 'white',
          boxShadow: isRunning ? `0 0 0 2px ${cfg.color}20` : '0 1px 3px rgba(0,0,0,0.06)',
          transition: 'box-shadow 0.2s',
        }}
      >
        {/* 顶行：名称 + 状态 */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
          <strong style={{ fontSize: 14, color: '#111827' }}>{exp.name}</strong>
          <span style={{ padding: '2px 8px', borderRadius: 10, fontSize: 11, fontWeight: 700, color: cfg.color, background: cfg.bg }}>
            {cfg.dot} {cfg.label}
          </span>
        </div>

        {/* 描述 */}
        <p style={{ margin: '0 0 8px 0', color: '#6b7280', fontSize: 12, lineHeight: 1.5 }}>
          {exp.description.slice(0, 70)}{exp.description.length > 70 ? '…' : ''}
        </p>

        {/* 执行中：当前阶段 */}
        {isRunning && phaseLabel && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8, padding: '5px 10px', background: '#eff6ff', borderRadius: 6 }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#3b82f6', display: 'inline-block', animation: 'pulse 1.5s infinite' }} />
            <span style={{ fontSize: 12, color: '#1d4ed8', fontWeight: 600 }}>当前阶段：{phaseLabel}</span>
          </div>
        )}

        {/* 完成：摘要数据 */}
        {summary && (
          <div style={{ display: 'flex', gap: 12, marginBottom: 8, fontSize: 11, color: '#6b7280' }}>
            <span>动作数 <strong style={{ color: '#374151' }}>{summary.total_actions}</strong></span>
            {summary.failure_step && <span style={{ color: '#dc2626' }}>失败于 {getPhaseLabel(summary.failure_step) || summary.failure_step}</span>}
            {summary.final_output && <span style={{ color: '#059669' }}>有输出</span>}
          </div>
        )}

        {/* 底行：时间 + runtime */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 11, color: '#9ca3af' }}>
          <span>{exp.createdAt}</span>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {runtime && (
              <span style={{
                padding: '1px 6px', borderRadius: 3, fontSize: 11, fontWeight: 600,
                color: runtime.mode === 'real' ? '#065f46' : '#374151',
                background: runtime.mode === 'real' ? '#d1fae5' : '#f3f4f6'
              }}>
                {runtime.mode === 'real' ? '🟢' : runtime.mode === 'simulated' ? '🔧' : '🎭'} {runtime.mode}
              </span>
            )}
            {exp.events && exp.events.length > 0 && <span>{exp.events.length} 事件</span>}
          </div>
        </div>
      </div>
    )
  }

  const ZoneHeader = ({ title, count, color, bg, hint }: { title: string; count: number; color: string; bg: string; hint: string }) => (
    <div style={{ background: bg, border: `1px solid ${color}40`, borderRadius: 8, padding: '10px 14px', marginBottom: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color }}>{title} <span style={{ fontWeight: 400, opacity: 0.7 }}>({count})</span></h3>
        <span style={{ fontSize: 11, color, opacity: 0.8 }}>{hint}</span>
      </div>
    </div>
  )

  if (experiments.length === 0) {
    return (
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>实验工作台</h2>
          <button onClick={onCreate} style={{ backgroundColor: '#3b82f6', color: 'white', padding: '8px 18px', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 600, fontSize: 14 }}>+ 新建实验</button>
        </div>

        {/* 欢迎说明 */}
        <div style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', borderRadius: 12, padding: '32px 40px', marginBottom: 32, color: 'white' }}>
          <div style={{ fontSize: 24, fontWeight: 700, marginBottom: 12 }}>欢迎使用 AgentLab 👋</div>
          <div style={{ fontSize: 15, lineHeight: 1.7, opacity: 0.95 }}>
            AgentLab 是 Agent 实验的编排与观察平台。你在这里创建实验、派发任务，<br/>
            OpenClaw 负责实际执行，并在关键决策点回来找你确认下一步。
          </div>
        </div>

        {/* 核心概念 */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16, marginBottom: 32 }}>
          {[
            { icon: '🦾', title: 'OpenClaw', desc: 'Agent 执行环境，可以是本地设备、云端节点或模拟器。', color: '#7c3aed' },
            { icon: '🔌', title: 'Runtime', desc: '已连接的 OpenClaw 实例，在线时可接收任务并执行。', color: '#0891b2' },
            { icon: '🧪', title: 'Experiment', desc: '你下达的任务，包含目标描述和成功标准。', color: '#059669' },
            { icon: '👋', title: '人工决策', desc: '执行中遇到关键节点时，Agent 会暂停并请求你的决策。', color: '#dc2626' },
          ].map(item => (
            <div key={item.title} style={{ background: 'white', border: `1px solid ${item.color}20`, borderTop: `3px solid ${item.color}`, borderRadius: 10, padding: '16px 18px' }}>
              <div style={{ fontSize: 28, marginBottom: 8 }}>{item.icon}</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: item.color, marginBottom: 4 }}>{item.title}</div>
              <div style={{ fontSize: 12, color: '#6b7280', lineHeight: 1.5 }}>{item.desc}</div>
            </div>
          ))}
        </div>

        {/* 快速开始 */}
        <div style={{ background: 'white', border: '2px solid #3b82f6', borderRadius: 10, padding: '24px 28px', marginBottom: 32 }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#1e40af', marginBottom: 16 }}>🚀 快速开始</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {[
              { num: '1', title: '连接 OpenClaw Runtime', desc: '点击右上角「连接 OpenClaw」，启动本地 Connector 或选择已有 Runtime', action: '连接' },
              { num: '2', title: '创建第一个实验', desc: '描述你想让 Agent 完成的任务和成功标准', action: '创建' },
              { num: '3', title: '派发并观察执行', desc: '实验会发送到 Runtime 执行，你可以实时查看进度', action: '执行' },
              { num: '4', title: '关键节点做决策', desc: 'Agent 遇到不确定的情况会暂停，等待你的指示', action: '决策' },
            ].map(item => (
              <div key={item.num} style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#3b82f6', color: 'white', fontSize: 14, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{item.num}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: '#111827', marginBottom: 2 }}>{item.title}</div>
                  <div style={{ fontSize: 12, color: '#6b7280', lineHeight: 1.5 }}>{item.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ textAlign: 'center' }}>
          <button onClick={onCreate} style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white', padding: '14px 36px', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 700, fontSize: 15, boxShadow: '0 4px 12px rgba(102, 126, 234, 0.4)' }}>
            🚀 创建第一个实验
          </button>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>实验工作台</h2>
        <button onClick={onCreate} style={{ backgroundColor: '#3b82f6', color: 'white', padding: '8px 18px', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 600, fontSize: 14 }}>+ 新建实验</button>
      </div>
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'flex-start' }}>
        {/* 待执行 */}
        <div style={{ flex: 1, minWidth: 260 }}>
          <ZoneHeader title="待执行" count={pending.length} color="#92400e" bg="#fffbeb" hint="等待派发给 Runtime" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {pending.length === 0
              ? <div style={{ padding: '20px', textAlign: 'center', color: '#9ca3af', fontSize: 13, background: '#fffbeb', borderRadius: 8, border: '1px dashed #fcd34d' }}>暂无待执行实验</div>
              : pending.map(exp => <ExperimentCard key={exp.id} exp={exp} />)
            }
          </div>
        </div>

        {/* 执行中 */}
        <div style={{ flex: 1, minWidth: 260 }}>
          <ZoneHeader title="执行中" count={running.length} color="#1d4ed8" bg="#eff6ff" hint="Agent 正在工作" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {running.length === 0
              ? <div style={{ padding: '20px', textAlign: 'center', color: '#9ca3af', fontSize: 13, background: '#eff6ff', borderRadius: 8, border: '1px dashed #93c5fd' }}>暂无执行中实验</div>
              : running.map(exp => <ExperimentCard key={exp.id} exp={exp} />)
            }
          </div>
        </div>

        {/* 已完成 */}
        <div style={{ flex: 1, minWidth: 260 }}>
          <ZoneHeader title="已完成" count={completed.length} color="#065f46" bg="#ecfdf5" hint="查看结果和摘要" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {completed.length === 0
              ? <div style={{ padding: '20px', textAlign: 'center', color: '#9ca3af', fontSize: 13, background: '#ecfdf5', borderRadius: 8, border: '1px dashed #6ee7b7' }}>暂无已完成实验</div>
              : completed.map(exp => <ExperimentCard key={exp.id} exp={exp} />)
            }
          </div>
        </div>
      </div>
    </div>
  )
}
