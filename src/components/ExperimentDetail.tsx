import { Experiment } from '../types'

interface Props {
  experiment: Experiment
  onBack: () => void
  onIntervene: () => void
}

export default function ExperimentDetail({ experiment, onBack, onIntervene }: Props) {
  return (
    <div>
      <button onClick={onBack}>← 返回</button>
      <h2>{experiment.name}</h2>
      <p>状态: {experiment.status}</p>
      <button onClick={onIntervene} disabled={experiment.status !== 'running'}>
        人工介入
      </button>
      <h3 style={{ marginTop: '20px' }}>事件时间线</h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {experiment.events.map(event => (
          <div key={event.id} style={{ padding: '10px', border: '1px solid #eee', borderRadius: '4px' }}>
            <strong>{event.type}</strong> - {event.timestamp}
            <p>{event.message}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
