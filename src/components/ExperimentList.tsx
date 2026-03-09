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

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
        <h2>实验列表</h2>
        <button onClick={onCreate} style={{ backgroundColor: '#2196F3', color: 'white', padding: '8px 16px', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>+ 创建实验</button>
      </div>
      {experiments.length === 0 ? (
        <p style={{ color: '#999', textAlign: 'center', padding: '40px 0' }}>暂无实验，点击"创建实验"开始</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {experiments.map(exp => (
            <div key={exp.id} onClick={() => onSelect(exp.id)} style={{ padding: '15px', border: '1px solid #ddd', borderRadius: '4px', cursor: 'pointer', backgroundColor: '#fafafa' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px' }}>
                <strong style={{ fontSize: '1.1em' }}>{exp.name}</strong>
                <span style={{ color: statusColor(exp.status), fontWeight: 'bold', fontSize: '0.9em' }}>{exp.status}</span>
              </div>
              <p style={{ margin: '5px 0 0 0', color: '#666', fontSize: '0.9em' }}>{exp.description}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
