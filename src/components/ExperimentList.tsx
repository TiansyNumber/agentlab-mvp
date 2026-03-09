import { Experiment } from '../types'

interface Props {
  experiments: Experiment[]
  onSelect: (id: string) => void
  onCreate: () => void
}

export default function ExperimentList({ experiments, onSelect, onCreate }: Props) {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
        <h2>实验列表</h2>
        <button onClick={onCreate}>创建实验</button>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {experiments.map(exp => (
          <div key={exp.id} onClick={() => onSelect(exp.id)} style={{
            padding: '15px',
            border: '1px solid #ddd',
            borderRadius: '4px',
            cursor: 'pointer'
          }}>
            <h3>{exp.name}</h3>
            <p>状态: {exp.status} | 创建时间: {exp.createdAt}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
