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
  const running   = experiments.filter(e => e.status === 'running' || e.status === 'paused')
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

        {/* 概念说明卡 */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 32 }}>
          {[
            { icon: '🦾', title: 'OpenClaw', desc: '你的 Agent 运行环境。可以是本地设备、云端节点，或模拟器。每个 OpenClaw 是一个独立的执行单元。', color: '#7c3aed' },
            { icon: '🔌', title: 'Runtime', desc: '已连接到平台的 OpenClaw 实例。在线时可以接收实验任务，执行后返回结果。', color: '#0891b2' },
            { icon: '🧪', title: 'Experiment', desc: '你给 Agent 下达的一次任务。描述目标、成功标准，然后派发给 Runtime 执行。', color: '#059669' },
          ].map(item => (
            <div key={item.title} style={{ background: 'white', border: `1px solid ${item.color}20`, borderTop: `3px solid ${item.color}`, borderRadius: 10, padding: '18px 20px' }}>
              <div style={{ fontSize: 28, marginBottom: 8 }}>{item.icon}</div>
              <div style={{ fontSize: 15, fontWeight: 700, color: item.color, marginBottom: 6 }}>{item.title}</div>
              <div style={{ fontSize: 13, color: '#6b7280', lineHeight: 1.6 }}>{item.desc}</div>
            </div>
          ))}
        </div>

        {/* 流程说明 */}
        <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: 10, padding: '20px 24px', marginBottom: 32 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#374151', marginBottom: 14 }}>工作流程</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 0, flexWrap: 'wrap' }}>
            {[
              { step: '1', label: '连接 OpenClaw', sub: '点击右上角「连接 OpenClaw」' },
              { step: '→', label: '', sub: '' },
              { step: '2', label: '创建实验', sub: '描述任务目标和成功标准' },
              { step: '→', label: '', sub: '' },
              { step: '3', label: '派发执行', sub: '选择 Runtime，后端启动' },
              { step: '→', label: '', sub: '' },
              { step: '4', label: '观察结果', sub: '查看执行过程和摘要' },
            ].map((item, i) => (
              item.step === '→'
                ? <div key={i} style={{ fontSize: 18, color: '#d1d5db', padding: '0 8px' }}>→</div>
                : <div key={i} style={{ flex: 1, minWidth: 120, textAlign: 'center', padding: '10px 8px' }}>
                    <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#3b82f6', color: 'white', fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 6px' }}>{item.step}</div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#111827', marginBottom: 2 }}>{item.label}</div>
                    <div style={{ fontSize: 11, color: '#9ca3af' }}>{item.sub}</div>
                  </div>
            ))}
          </div>
        </div>

        <div style={{ textAlign: 'center' }}>
          <button onClick={onCreate} style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white', padding: '12px 32px', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 700, fontSize: 15 }}>
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
