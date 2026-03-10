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

  const getModeLabel = (mode?: string) => {
    if (!mode) return '未分配';
    const labels: Record<string, string> = { demo: '🎭 Demo', simulated: '🔧 Simulated', real: '🟢 Real' };
    return labels[mode] || mode;
  };

  const categorizeEvent = (type: string) => {
    const phase = ['connecting_gateway', 'connected', 'authenticating', 'authenticated', 'task_submitted', 'command_sent'];
    const action = ['agent_thinking', 'agent_action', 'action_received', 'execution_running'];
    const error = ['start_failed', 'experiment_failed', 'experiment_timeout', 'auth_failed', 'gateway_connect_failed'];
    const success = ['experiment_completed', 'execution_completed'];

    if (phase.includes(type)) return { label: '阶段', color: '#2196F3', bg: '#e3f2fd' };
    if (action.includes(type)) return { label: '动作', color: '#FF9800', bg: '#fff3e0' };
    if (error.includes(type)) return { label: '错误', color: '#F44336', bg: '#ffebee' };
    if (success.includes(type)) return { label: '完成', color: '#4CAF50', bg: '#e8f5e9' };
    return { label: '其他', color: '#999', bg: '#f9f9f9' };
  };

  return (
    <div>
      <button onClick={onBack} style={{ marginBottom: '15px' }}>← 返回</button>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
        <div>
          <h2 style={{ margin: '0 0 10px 0' }}>{experiment.name}</h2>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <span style={{ color: statusColor, fontWeight: 'bold', fontSize: '1.1em' }}>{experiment.status}</span>
            {experiment.runtimeMode && (
              <span style={{ fontSize: '0.9em', color: '#666' }}>
                Runtime: {getModeLabel(experiment.runtimeMode)}
              </span>
            )}
          </div>
        </div>
      </div>

      <div style={{ backgroundColor: '#f9f9f9', padding: '12px', borderRadius: '6px', marginBottom: '15px', fontSize: '0.95em' }}>
        <p style={{ margin: '5px 0' }}><strong>描述:</strong> {experiment.description}</p>
        <p style={{ margin: '5px 0' }}><strong>成功标准:</strong> {experiment.successCriteria}</p>
        <p style={{ margin: '5px 0' }}><strong>失败条件:</strong> {experiment.failureConditions}</p>
        <p style={{ margin: '5px 0' }}><strong>模型:</strong> {experiment.model}</p>
        <p style={{ margin: '5px 0' }}><strong>工具:</strong> {experiment.tools.join(', ') || '无'}</p>
        <p style={{ margin: '5px 0' }}><strong>限制:</strong> 最大步数 {experiment.maxSteps} | 最大Token {experiment.maxTokens} | 最大时长 {experiment.maxDuration}分钟</p>
      </div>

      <div style={{ marginBottom: '20px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        {onStartWithBackend && <button onClick={onStartWithBackend} disabled={experiment.status !== 'draft'} style={{ backgroundColor: '#2196F3', color: 'white', padding: '8px 14px', border: 'none', borderRadius: '4px', cursor: experiment.status === 'draft' ? 'pointer' : 'not-allowed', opacity: experiment.status === 'draft' ? 1 : 0.5 }}>后端启动</button>}
        <button onClick={onResume} disabled={!canResume} style={{ padding: '8px 14px', opacity: canResume ? 1 : 0.5 }}>继续</button>
        <button onClick={onPause} disabled={!canPause} style={{ padding: '8px 14px', opacity: canPause ? 1 : 0.5 }}>暂停</button>
        <button onClick={onStop} disabled={!canStop} style={{ padding: '8px 14px', opacity: canStop ? 1 : 0.5 }}>停止</button>
        {canRetry && <button onClick={onRetry} style={{ backgroundColor: '#FF9800', color: 'white', padding: '8px 14px', border: 'none', borderRadius: '4px' }}>重试</button>}
        <button onClick={onMarkSuccess} disabled={!canMark} style={{ padding: '8px 14px', opacity: canMark ? 1 : 0.5 }}>标记成功</button>
        <button onClick={onMarkFailed} disabled={!canMark} style={{ padding: '8px 14px', opacity: canMark ? 1 : 0.5 }}>标记失败</button>
        <button onClick={onGenerateSkill} disabled={!canGenerateSkill} style={{ padding: '8px 14px', opacity: canGenerateSkill ? 1 : 0.5, backgroundColor: canGenerateSkill ? '#4CAF50' : undefined, color: canGenerateSkill ? 'white' : undefined, border: canGenerateSkill ? 'none' : undefined }}>生成技能草稿</button>
      </div>

      <h3 style={{ marginBottom: '12px' }}>事件观察台 ({experiment.events.length})</h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {experiment.events.length === 0 ? (
          <p style={{ color: '#999', textAlign: 'center', padding: '20px' }}>暂无事件</p>
        ) : (
          experiment.events.map(event => {
            const cat = categorizeEvent(event.type);
            return (
              <div key={event.id} style={{ padding: '10px 12px', border: `1px solid ${cat.color}`, borderLeft: `4px solid ${cat.color}`, borderRadius: '4px', backgroundColor: cat.bg }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', alignItems: 'center' }}>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.75em', backgroundColor: cat.color, color: 'white', padding: '2px 6px', borderRadius: '3px' }}>{cat.label}</span>
                    <strong style={{ fontSize: '0.9em', color: cat.color }}>{event.type}</strong>
                  </div>
                  <span style={{ color: '#888', fontSize: '0.85em' }}>{event.timestamp}</span>
                </div>
                <p style={{ margin: 0, fontSize: '0.9em', color: '#333' }}>{event.message}</p>
              </div>
            );
          })
        )}
      </div>
    </div>
  )
}
