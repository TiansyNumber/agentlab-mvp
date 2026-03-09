import { Experiment } from '../types'

interface Props {
  experiment: Experiment
  onBack: () => void
  onResume: () => void
  onPause: () => void
  onStop: () => void
  onMarkSuccess: () => void
  onMarkFailed: () => void
  onGenerateSkill: () => void
}

export default function ExperimentDetail({ experiment, onBack, onResume, onPause, onStop, onMarkSuccess, onMarkFailed, onGenerateSkill }: Props) {
  const canResume = experiment.status === 'paused'
  const canPause = experiment.status === 'running'
  const canStop = experiment.status === 'running' || experiment.status === 'paused'
  const canMark = experiment.status === 'running' || experiment.status === 'paused'
  const canGenerateSkill = experiment.status === 'success'

  return (
    <div>
      <button onClick={onBack}>← 返回</button>
      <h2>{experiment.name}</h2>
      <p><strong>状态:</strong> {experiment.status}</p>
      <p><strong>描述:</strong> {experiment.description}</p>
      <p><strong>成功标准:</strong> {experiment.successCriteria}</p>
      <p><strong>模型:</strong> {experiment.model}</p>
      <p><strong>工具:</strong> {experiment.tools.join(', ')}</p>

      <div style={{ marginTop: '15px', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
        <button onClick={onResume} disabled={!canResume}>继续</button>
        <button onClick={onPause} disabled={!canPause}>暂停</button>
        <button onClick={onStop} disabled={!canStop}>停止</button>
        <button onClick={onMarkSuccess} disabled={!canMark}>标记成功</button>
        <button onClick={onMarkFailed} disabled={!canMark}>标记失败</button>
        <button onClick={onGenerateSkill} disabled={!canGenerateSkill}>生成技能草稿</button>
      </div>

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
