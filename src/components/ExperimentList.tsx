import { Experiment } from '../types'

interface Props {
  experiments: Experiment[]
  onSelect: (id: string) => void
  onCreate: () => void
}

export default function ExperimentList({ experiments, onSelect, onCreate }: Props) {
  const statusColor = (status: string) => ({
    draft: '#999',
    running: '#2196F3',
    paused: '#FF9800',
    success: '#4CAF50',
    failed: '#F44336'
  }[status] || '#999')

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
          items.map(exp => (
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
              <div style={{ marginTop: 6, fontSize: 11, color: '#9ca3af' }}>{exp.createdAt}</div>
            </div>
          ))
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
        <p style={{ color: '#9ca3af', textAlign: 'center', padding: '60px 0', fontSize: 14 }}>暂无实验，点击"创建实验"开始</p>
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
