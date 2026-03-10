import { Experiment, ExperimentPhase } from '../types'

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

const phaseLabels: Record<ExperimentPhase, string> = {
  created: '创建任务',
  connecting: '连接 Runtime',
  connected: '连接成功',
  authenticating: '认证中',
  authenticated: '认证成功',
  command_sent: '发送命令',
  action_received: '收到 Action',
  execution_running: '执行中',
  execution_completed: '执行完成',
  execution_failed: '执行失败',
  disconnected: '已断开'
}

export default function ExperimentDetail({ experiment, onBack, onResume, onPause, onStop, onMarkSuccess, onMarkFailed, onGenerateSkill, onStartWithBackend, onRetry }: Props) {
  const canResume = experiment.status === 'paused'
  const canPause = experiment.status === 'running'
  const canStop = experiment.status === 'running' || experiment.status === 'paused'
  const canMark = experiment.status === 'running' || experiment.status === 'paused'
  const canGenerateSkill = experiment.status === 'success'
  const canRetry = (experiment.status === 'failed' || experiment.status === 'success') && onRetry

  const currentStep = experiment.execution_steps?.find(s => s.status === 'running')
  const needsIntervention = experiment.status === 'paused' || (experiment.status === 'running' && canMark)

  return (
    <div>
      <button onClick={onBack} style={{ marginBottom: '15px' }}>← 返回</button>

      {/* Agent Lab Hero */}
      <div style={{
        background: experiment.status === 'running' ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' :
                    experiment.status === 'paused' ? 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)' :
                    experiment.status === 'success' ? 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)' :
                    experiment.status === 'failed' ? 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)' :
                    'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
        borderRadius: '12px',
        padding: '24px',
        marginBottom: '20px',
        color: 'white',
        boxShadow: '0 4px 20px rgba(0,0,0,0.1)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
          <div>
            <div style={{ fontSize: '13px', opacity: 0.9, marginBottom: '4px' }}>🧪 实验室</div>
            <h2 style={{ margin: 0, fontSize: '24px', fontWeight: 700 }}>{experiment.name}</h2>
          </div>
          <div style={{
            background: 'rgba(255,255,255,0.25)',
            padding: '6px 14px',
            borderRadius: '20px',
            fontSize: '13px',
            fontWeight: 600,
            backdropFilter: 'blur(10px)'
          }}>
            {experiment.status === 'running' ? '🔬 实验中' :
             experiment.status === 'paused' ? '⏸️ 已暂停' :
             experiment.status === 'success' ? '✅ 成功' :
             experiment.status === 'failed' ? '❌ 失败' : '📝 草稿'}
          </div>
        </div>

        {currentStep && (
          <div style={{
            background: 'rgba(255,255,255,0.2)',
            borderRadius: '8px',
            padding: '12px 16px',
            marginBottom: '12px',
            backdropFilter: 'blur(10px)'
          }}>
            <div style={{ fontSize: '12px', opacity: 0.9, marginBottom: '4px' }}>Agent 正在执行</div>
            <div style={{ fontSize: '16px', fontWeight: 600 }}>
              {phaseLabels[currentStep.phase]}
              <span style={{ marginLeft: '8px', fontSize: '14px', opacity: 0.8 }}>⟳</span>
            </div>
          </div>
        )}

        {needsIntervention && (
          <div style={{
            background: 'rgba(255,255,255,0.95)',
            color: '#1a1a1a',
            borderRadius: '8px',
            padding: '14px 16px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
          }}>
            <span style={{ fontSize: '24px' }}>👋</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: '14px', marginBottom: '2px' }}>需要你的决策</div>
              <div style={{ fontSize: '12px', opacity: 0.7 }}>
                {experiment.status === 'paused' ? '实验已暂停，等待你继续' : '可以标记实验结果或继续观察'}
              </div>
            </div>
          </div>
        )}
      </div>

      <p><strong>描述:</strong> {experiment.description}</p>
      <details style={{ marginBottom: '16px' }}>
        <summary style={{ cursor: 'pointer', fontWeight: 600, marginBottom: '8px' }}>📋 实验配置</summary>
        <div style={{ paddingLeft: '16px', fontSize: '14px', color: '#555' }}>
          <p><strong>描述:</strong> {experiment.description}</p>
          <p><strong>成功标准:</strong> {experiment.successCriteria}</p>
          <p><strong>失败条件:</strong> {experiment.failureConditions}</p>
          <p><strong>模型:</strong> {experiment.model}</p>
          <p><strong>工具:</strong> {experiment.tools.join(', ') || '无'}</p>
          <p><strong>限制:</strong> 最大步数 {experiment.maxSteps} | 最大Token {experiment.maxTokens} | 最大时长 {experiment.maxDuration}分钟</p>
        </div>
      </details>

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

      {experiment.execution_steps && experiment.execution_steps.length > 0 && (
        <>
          <h3 style={{ marginTop: '20px', marginBottom: 12 }}>执行步骤流程</h3>
          <div style={{ position: 'relative', paddingLeft: '24px', marginBottom: '20px' }}>
            <div style={{ position: 'absolute', left: '11px', top: '12px', bottom: '12px', width: '2px', background: '#e5e7eb' }} />
            {experiment.execution_steps.map((step, idx) => {
              const isLast = idx === experiment.execution_steps!.length - 1;
              const stepColor = step.status === 'completed' ? '#10b981' : step.status === 'failed' ? '#ef4444' : '#3b82f6';
              const stepIcon = step.status === 'completed' ? '✓' : step.status === 'failed' ? '✖' : '⟳';

              return (
                <div key={step.step_id} style={{ position: 'relative', marginBottom: idx === experiment.execution_steps!.length - 1 ? 0 : '12px' }}>
                  <div style={{
                    position: 'absolute',
                    left: '-24px',
                    top: '12px',
                    width: '24px',
                    height: '24px',
                    borderRadius: '50%',
                    background: stepColor,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontSize: '12px',
                    fontWeight: 'bold',
                    zIndex: 1
                  }}>
                    {stepIcon}
                  </div>
                  <div style={{
                    padding: '12px 16px',
                    border: `2px solid ${stepColor}20`,
                    borderLeft: `4px solid ${stepColor}`,
                    borderRadius: '8px',
                    backgroundColor: step.status === 'completed' ? '#f0fdf4' : step.status === 'failed' ? '#fef2f2' : '#eff6ff',
                    boxShadow: isLast && step.status === 'running' ? `0 0 0 3px ${stepColor}20` : 'none',
                    transition: 'all 0.3s'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: step.error ? '8px' : 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 14, fontWeight: 700, color: '#111827' }}>{phaseLabels[step.phase]}</span>
                        {step.status === 'running' && (
                          <span style={{ fontSize: 11, color: '#6b7280', padding: '2px 6px', background: 'white', borderRadius: 3 }}>
                            进行中...
                          </span>
                        )}
                      </div>
                      <span style={{ fontSize: 11, color: '#9ca3af', fontWeight: 600 }}>
                        {step.completed_at ? `${((step.completed_at - step.started_at) / 1000).toFixed(1)}s` : '...'}
                      </span>
                    </div>
                    {step.error && (
                      <div style={{ padding: '8px', background: '#fee2e2', borderRadius: '4px', fontSize: 12, color: '#991b1b' }}>
                        <strong>错误:</strong> {step.error}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {experiment.execution_summary && (
        <>
          <h3 style={{ marginTop: '20px', marginBottom: 12 }}>执行结果摘要</h3>
          <div style={{
            padding: '16px',
            border: `2px solid ${experiment.status === 'success' ? '#10b981' : experiment.status === 'failed' ? '#ef4444' : '#e5e7eb'}`,
            borderRadius: '8px',
            backgroundColor: experiment.status === 'success' ? '#f0fdf4' : experiment.status === 'failed' ? '#fef2f2' : '#f9fafb',
            marginBottom: '16px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 20 }}>{experiment.status === 'success' ? '✅' : experiment.status === 'failed' ? '❌' : '🔄'}</span>
                <span style={{ fontSize: 15, fontWeight: 700, color: experiment.status === 'success' ? '#065f46' : experiment.status === 'failed' ? '#991b1b' : '#374151' }}>
                  {experiment.status === 'success' ? '执行成功' : experiment.status === 'failed' ? '执行失败' : '执行中'}
                </span>
              </div>
              <span style={{ fontSize: 13, color: '#6b7280' }}>
                共 <strong>{experiment.execution_summary.total_actions}</strong> 个动作
              </span>
            </div>

            {experiment.execution_summary.failure_step && (
              <div style={{ padding: '8px 12px', background: '#fee2e2', borderRadius: '6px', marginBottom: '10px', borderLeft: '4px solid #ef4444' }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: '#991b1b' }}>失败阶段：</span>
                <span style={{ fontSize: 12, color: '#7f1d1d', marginLeft: 6 }}>{phaseLabels[experiment.execution_summary.failure_step as ExperimentPhase] ?? experiment.execution_summary.failure_step}</span>
              </div>
            )}

            {experiment.execution_summary.key_actions.length > 0 && (
              <div style={{ marginBottom: '10px' }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: '6px' }}>关键动作</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  {experiment.execution_summary.key_actions.map((action, idx) => (
                    <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: 12, color: '#374151' }}>
                      <span style={{ color: '#6b7280', flexShrink: 0, fontWeight: 600, minWidth: '18px' }}>{idx + 1}.</span>
                      <span style={{ lineHeight: 1.5 }}>{action}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {experiment.execution_summary.final_output && (
              <div style={{ padding: '10px 12px', background: 'white', borderRadius: '6px', borderLeft: '4px solid #10b981' }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#065f46', marginBottom: '4px' }}>最终输出</div>
                <div style={{ fontSize: 13, color: '#374151', lineHeight: 1.5 }}>{experiment.execution_summary.final_output}</div>
              </div>
            )}
          </div>
        </>
      )}

      <h3 style={{ marginTop: '20px', marginBottom: 12 }}>执行过程观察</h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {experiment.events.map(event => {
          const isPhaseEvent = ['start', 'connecting_gateway', 'connected', 'authenticating', 'authenticated', 'task_submitted', 'command_sent'].includes(event.type);
          const isActionEvent = ['action', 'agent_thinking', 'agent_action', 'action_received', 'execution_running'].includes(event.type);
          const isErrorEvent = ['failed', 'start_failed', 'experiment_failed', 'experiment_timeout', 'auth_failed', 'gateway_connect_failed'].includes(event.type);
          const isCompleteEvent = ['success', 'complete', 'experiment_completed', 'execution_completed'].includes(event.type);

          let config = { bg: '#f9fafb', border: '#e5e7eb', icon: '●', label: 'INFO', title: '信息' };
          if (isPhaseEvent) config = { bg: '#eff6ff', border: '#3b82f6', icon: '▶', label: 'PHASE', title: '阶段' };
          else if (isActionEvent) config = { bg: '#fffbeb', border: '#f59e0b', icon: '⚡', label: 'ACTION', title: '动作' };
          else if (isErrorEvent) config = { bg: '#fef2f2', border: '#ef4444', icon: '✖', label: 'ERROR', title: '错误' };
          else if (isCompleteEvent) config = { bg: '#f0fdf4', border: '#10b981', icon: '✓', label: 'COMPLETE', title: '完成' };

          return (
            <div key={event.id} style={{
              padding: '10px 12px',
              border: `2px solid ${config.border}`,
              borderLeft: `4px solid ${config.border}`,
              borderRadius: '6px',
              backgroundColor: config.bg
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 14, color: config.border }}>{config.icon}</span>
                  <span style={{ fontSize: 11, fontWeight: 700, color: config.border, letterSpacing: 0.5 }}>{config.title}</span>
                  <span style={{ fontSize: 12, color: '#6b7280', backgroundColor: 'white', padding: '2px 6px', borderRadius: '3px' }}>{event.type}</span>
                </div>
                <span style={{ color: '#9ca3af', fontSize: '11px', whiteSpace: 'nowrap' }}>{event.timestamp}</span>
              </div>
              <p style={{ margin: 0, fontSize: 13, color: '#374151', lineHeight: 1.5 }}>{event.message}</p>
            </div>
          );
        })}
      </div>
    </div>
  )
}
