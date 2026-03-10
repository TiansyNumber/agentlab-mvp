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
  onStartWithBackend?: () => void
  onRetry?: () => void
}

export default function ExperimentDetail({ experiment, onBack, onResume, onPause, onStop, onMarkSuccess, onMarkFailed, onGenerateSkill, onStartWithBackend, onRetry }: Props) {
  const canResume = experiment.status === 'paused'
  const canPause = experiment.status === 'running'
  const canStop = experiment.status === 'running' || experiment.status === 'paused'
  const canMark = experiment.status === 'running' || experiment.status === 'paused'
  const canGenerateSkill = experiment.status === 'success'
  const canRetry = (experiment.status === 'failed' || experiment.status === 'success') && onRetry

  const statusColor = {
    draft: '#999',
    running: '#2196F3',
    paused: '#FF9800',
    success: '#4CAF50',
    failed: '#F44336'
  }[experiment.status]

  return (
    <div>
      <button onClick={onBack} style={{ marginBottom: '15px' }}>← 返回</button>
      <h2>{experiment.name}</h2>
      <p><strong>状态:</strong> <span style={{ color: statusColor, fontWeight: 'bold' }}>{experiment.status}</span></p>
      <p><strong>描述:</strong> {experiment.description}</p>
      <p><strong>成功标准:</strong> {experiment.successCriteria}</p>
      <p><strong>失败条件:</strong> {experiment.failureConditions}</p>
      <p><strong>模型:</strong> {experiment.model}</p>
      <p><strong>工具:</strong> {experiment.tools.join(', ') || '无'}</p>
      <p><strong>限制:</strong> 最大步数 {experiment.maxSteps} | 最大Token {experiment.maxTokens} | 最大时长 {experiment.maxDuration}分钟</p>

      <div style={{ marginTop: '15px', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
        {onStartWithBackend && <button onClick={onStartWithBackend} disabled={experiment.status !== 'draft'} style={{ backgroundColor: '#2196F3', color: 'white' }}>后端启动</button>}
        <button onClick={onResume} disabled={!canResume} style={{ opacity: canResume ? 1 : 0.5 }}>继续</button>
        <button onClick={onPause} disabled={!canPause} style={{ opacity: canPause ? 1 : 0.5 }}>暂停</button>
        <button onClick={onStop} disabled={!canStop} style={{ opacity: canStop ? 1 : 0.5 }}>停止</button>
        {canRetry && <button onClick={onRetry} style={{ backgroundColor: '#FF9800', color: 'white' }}>重试</button>}
        <button onClick={onMarkSuccess} disabled={!canMark} style={{ opacity: canMark ? 1 : 0.5 }}>标记成功</button>
        <button onClick={onMarkFailed} disabled={!canMark} style={{ opacity: canMark ? 1 : 0.5 }}>标记失败</button>
        <button onClick={onGenerateSkill} disabled={!canGenerateSkill} style={{ opacity: canGenerateSkill ? 1 : 0.5, backgroundColor: canGenerateSkill ? '#4CAF50' : undefined, color: canGenerateSkill ? 'white' : undefined }}>生成技能草稿</button>
      </div>

      <h3 style={{ marginTop: '20px' }}>事件时间线</h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {experiment.events.map(event => {
          const isPhaseEvent = ['connecting_gateway', 'connected', 'authenticating', 'authenticated', 'task_submitted', 'command_sent'].includes(event.type);
          const isActionEvent = ['agent_thinking', 'agent_action', 'action_received', 'execution_running'].includes(event.type);
          const isErrorEvent = ['start_failed', 'experiment_failed', 'experiment_timeout', 'auth_failed', 'gateway_connect_failed'].includes(event.type);
          const isSuccessEvent = ['experiment_completed', 'execution_completed'].includes(event.type);

          let bgColor = '#f9f9f9';
          let borderColor = '#ddd';
          if (isPhaseEvent) { bgColor = '#e3f2fd'; borderColor = '#2196F3'; }
          else if (isActionEvent) { bgColor = '#fff3e0'; borderColor = '#FF9800'; }
          else if (isErrorEvent) { bgColor = '#ffebee'; borderColor = '#F44336'; }
          else if (isSuccessEvent) { bgColor = '#e8f5e9'; borderColor = '#4CAF50'; }

          return (
            <div key={event.id} style={{ padding: '10px', border: `1px solid ${borderColor}`, borderRadius: '4px', backgroundColor: bgColor }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                <strong style={{ textTransform: 'uppercase', fontSize: '0.85em', color: borderColor }}>{event.type}</strong>
                <span style={{ color: '#666', fontSize: '0.9em' }}>{event.timestamp}</span>
              </div>
              <p style={{ margin: 0 }}>{event.message}</p>
            </div>
          );
        })}
      </div>
    </div>
  )
}
