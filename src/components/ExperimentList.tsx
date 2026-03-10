import { Experiment } from '../types'

interface Props {
  experiments: Experiment[]
  onSelect: (id: string) => void
  onCreate: () => void
  runtimes?: Array<{ id: string; mode: string; status: string }>
}

export default function ExperimentList({ experiments, onSelect, onCreate, runtimes = [] }: Props) {
  const statusColor = (status: string) => ({
    draft: '#999',
    running: '#2196F3',
    paused: '#FF9800',
    success: '#4CAF50',
    failed: '#F44336'
  }[status] || '#999')

  const getRuntimeInfo = (runtimeId?: string) => {
    if (!runtimeId) return null;
    return runtimes.find(r => r.id === runtimeId);
  };

  const getRuntimeModeLabel = (mode: string) => {
    const labels: Record<string, string> = { demo: '🎭 Demo', simulated: '🔧 Sim', real: '🟢 Real' };
    return labels[mode] || mode;
  };

  const pending = experiments.filter(e => e.status === 'draft')
  const running = experiments.filter(e => e.status === 'running' || e.status === 'paused')
  const completed = experiments.filter(e => e.status === 'success' || e.status === 'failed')

  const renderZone = (title: string, items: Experiment[], bgColor: string, borderColor: string) => (
    <div style={{ flex: 1, minWidth: 280 }}>
      <div style={{ background: bgColor, border: `2px solid ${borderColor}`, borderRadius: 8, padding: 12, marginBottom: 8 }}>
        <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: borderColor }}>{title} ({items.length})</h3>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {items.length === 0 ? (
          <div style={{ padding: 20, textAlign: 'center', color: '#9ca3af', fontSize: 13 }}>暂无任务</div>
        ) : (
          items.map(exp => {
            const runtime = getRuntimeInfo(exp.runtime_id);
            return (
            <div key={exp.id} onClick={() => onSelect(exp.id)} style={{
              padding: 12,
              border: `1px solid ${borderColor}`,
              borderRadius: 6,
              cursor: 'pointer',
              background: 'white',
              transition: 'all 0.2s'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <strong style={{ fontSize: 14, color: '#111827' }}>{exp.name}</strong>
                <span style={{ padding: '2px 6px', borderRadius: 3, fontSize: 11, fontWeight: 600, color: statusColor(exp.status), background: `${statusColor(exp.status)}20` }}>
                  {exp.status}
                </span>
              </div>
              <p style={{ margin: 0, color: '#6b7280', fontSize: 12, lineHeight: 1.4 }}>{exp.description.slice(0, 60)}{exp.description.length > 60 ? '...' : ''}</p>
              <div style={{ marginTop: 6, fontSize: 11, color: '#9ca3af', display: 'flex', gap: 8 }}>
                <span>{exp.createdAt}</span>
                {runtime && <span style={{ color: runtime.mode === 'real' ? '#10b981' : '#9ca3af' }}>Runtime: {getRuntimeModeLabel(runtime.mode)}</span>}
                {exp.events && exp.events.length > 0 && <span>{exp.events.length} 事件</span>}
              </div>
            </div>
            );
          })
        )}
      </div>
    </div>
  )

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h2 style={{ margin: 0 }}>任务调度中心</h2>
        <button onClick={onCreate} style={{ backgroundColor: '#3b82f6', color: 'white', padding: '8px 16px', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 600 }}>+ 创建实验</button>
      </div>
      {experiments.length === 0 ? (
        <div style={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          borderRadius: '12px',
          padding: '32px',
          color: 'white',
          textAlign: 'center',
          maxWidth: '600px',
          margin: '40px auto'
        }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>🧪</div>
          <h3 style={{ margin: '0 0 12px 0', fontSize: '20px' }}>欢迎来到 Agent 实验室</h3>
          <p style={{ margin: '0 0 20px 0', opacity: 0.9, fontSize: '14px', lineHeight: 1.6 }}>
            创建实验，让 Agent 替你执行任务。<br/>
            Agent 会自主工作，关键时刻会叫你回来决策。
          </p>
          <button onClick={onCreate} style={{
            background: 'white',
            color: '#667eea',
            padding: '10px 24px',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontWeight: 700,
            fontSize: '14px'
          }}>
            🚀 开始第一个实验
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          {renderZone('待执行', pending, '#fef3c7', '#f59e0b')}
          {renderZone('执行中', running, '#dbeafe', '#3b82f6')}
          {renderZone('已完成', completed, '#d1fae5', '#10b981')}
        </div>
      )}
    </div>
  )
}
