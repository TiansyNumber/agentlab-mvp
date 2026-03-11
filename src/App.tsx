import { useState, useEffect, useRef } from 'react'
import { Experiment, SkillDraft } from './types'
import ExperimentList from './components/ExperimentList'
import ExperimentForm from './components/ExperimentForm'
import ExperimentDetail from './components/ExperimentDetail'
import Settings from './components/Settings'
import OpenClawDebugPanel from './components/OpenClawDebugPanel'
import RuntimeManager from './components/RuntimeManager'
import CompareRuns from './components/CompareRuns'
import { saveExperiments, loadExperiments, saveSkills, loadSkills, generateSkillDraft } from './utils'
import { createEvent } from './services/experimentActions'
import { createRunner, RunnerType, IExperimentRunner } from './services/runners'
import { api } from './services/api'

function App() {
  const [view, setView] = useState<'list' | 'create' | 'detail' | 'settings' | 'openclaw-debug' | 'runtime' | 'compare'>('list')
  const [selectedId, setSelectedId] = useState<string>('')
  const [selectedRuntimeId, setSelectedRuntimeId] = useState<string>('')
  const [selectedRuntimeMode, setSelectedRuntimeMode] = useState<string>('')
  const [backendExperimentId, setBackendExperimentId] = useState<string>('')
  const [experiments, setExperiments] = useState<Experiment[]>([])
  const [skills, setSkills] = useState<SkillDraft[]>([])
  const [runnerType] = useState<RunnerType>('mock')
  const [runtimes, setRuntimes] = useState<Array<{ id: string; mode: string; status: string }>>([])
  const runnerRef = useRef<IExperimentRunner | null>(null)

  useEffect(() => {
    setExperiments(loadExperiments())
    setSkills(loadSkills())
    loadRuntimes()
  }, [])

  const loadRuntimes = async () => {
    try {
      const data = await api.listRuntimes();
      setRuntimes(data.map(r => ({ id: r.id, mode: r.mode, status: r.status })));
    } catch (err) {
      console.error('Failed to load runtimes:', err);
    }
  };

  useEffect(() => {
    saveExperiments(experiments)
  }, [experiments])

  const handleCreate = async (data: any) => {
    const newExp: Experiment = {
      id: Date.now().toString(),
      ...data,
      status: 'draft' as const,
      createdAt: new Date().toLocaleString('zh-CN'),
      events: [createEvent('start', '实验创建')],
      runtime_id: selectedRuntimeId || undefined,
      runtime_mode: selectedRuntimeMode || undefined
    }
    setExperiments([...experiments, newExp])
    setSelectedId(newExp.id)
    setView('detail')
  }

  const handleStartWithBackend = async (expId: string) => {
    if (!selectedRuntimeId) {
      alert('请先连接 OpenClaw');
      return;
    }
    const exp = experiments.find(e => e.id === expId);
    if (!exp) return;

    try {
      const result = await api.startExperiment({
        runtime_id: selectedRuntimeId,
        owner: 'default-user',
        task: exp.description
      });
      setBackendExperimentId(result.id);
      addEvent(expId, createEvent('action', `后端实验已启动: ${result.id}`));
      updateStatus(expId, 'running');

      // 保存 runtime 信息和 backend_experiment_id 到 experiment
      setExperiments(prev => prev.map(e => e.id === expId ? {
        ...e,
        runtime_id: selectedRuntimeId,
        runtime_mode: selectedRuntimeMode,
        backend_experiment_id: result.id,
        execution_steps: [
          {
            step_id: 'connecting',
            phase: 'connecting' as const,
            started_at: Date.now(),
            status: 'running' as const
          }
        ]
      } : e));

      let lastEventCount = 0;
      const keyActions: string[] = [];
      let totalActions = 0;
      const phaseTimestamps: Record<string, number> = { connecting: Date.now() };

      const pollEvents = setInterval(async () => {
        try {
          const events = await api.getExperimentEvents(result.id);
          if (events.length > lastEventCount) {
            const newEvents = events.slice(lastEventCount);
            newEvents.forEach(e => {
              const msg = typeof e.message === 'string' ? e.message : JSON.stringify(JSON.parse(e.message));
              addEvent(expId, createEvent('action', `[${e.type}] ${msg}`));
              totalActions++;

              // 根据 event 类型更新执行步骤
              const phaseMap: Record<string, string> = {
                'connecting_gateway': 'connecting',
                'connected': 'connected',
                'authenticating': 'authenticating',
                'authenticated': 'authenticated',
                'task_submitted': 'command_sent',
                'command_sent': 'command_sent',
                'action_received': 'action_received',
                'execution_running': 'execution_running',
                'experiment_completed': 'execution_completed',
                'experiment_stopped': 'execution_failed',
              };
              const phase = phaseMap[e.type];
              if (phase) {
                const now = Date.now();
                phaseTimestamps[phase] = now;
                setExperiments(prev => prev.map(exp => {
                  if (exp.id !== expId) return exp;
                  const existingSteps = exp.execution_steps || [];
                  const prevStepIdx = existingSteps.length - 1;
                  let updatedSteps = existingSteps.map((s, idx) => {
                    if (idx === prevStepIdx && s.status === 'running') {
                      return { ...s, status: 'completed' as const, completed_at: now };
                    }
                    return s;
                  });
                  if (phase !== 'execution_completed' && phase !== 'execution_failed') {
                    updatedSteps = [...updatedSteps, {
                      step_id: phase,
                      phase: phase as any,
                      started_at: now,
                      status: 'running' as const
                    }];
                  }
                  return { ...exp, execution_steps: updatedSteps };
                }));
              }

              // 收集关键动作
              if (['authenticated', 'task_submitted', 'action_received', 'experiment_completed'].includes(e.type)) {
                keyActions.push(msg.slice(0, 80));
              }

              if (e.type === 'experiment_completed') {
                setExperiments(prev => prev.map(exp => {
                  if (exp.id !== expId) return exp;
                  const now2 = Date.now();
                  return {
                    ...exp,
                    execution_steps: (exp.execution_steps || []).map((s, idx, arr) =>
                      idx === arr.length - 1 && s.status === 'running'
                        ? { ...s, status: 'completed' as const, completed_at: now2, phase: 'execution_completed' as const }
                        : s
                    ),
                    execution_summary: {
                      total_actions: totalActions,
                      key_actions: keyActions,
                      final_output: msg.slice(0, 200)
                    }
                  };
                }));
                updateStatus(expId, 'success');
                clearInterval(pollEvents);
              } else if (e.type === 'experiment_stopped') {
                setExperiments(prev => prev.map(exp => {
                  if (exp.id !== expId) return exp;
                  const now3 = Date.now();
                  const lastStep = exp.execution_steps?.[exp.execution_steps.length - 1];
                  return {
                    ...exp,
                    execution_steps: (exp.execution_steps || []).map((s, idx, arr) =>
                      idx === arr.length - 1 && s.status === 'running'
                        ? { ...s, status: 'failed' as const, completed_at: now3, error: '实验被停止' }
                        : s
                    ),
                    execution_summary: {
                      total_actions: totalActions,
                      key_actions: keyActions,
                      failure_step: lastStep?.phase
                    }
                  };
                }));
                updateStatus(expId, 'failed');
                clearInterval(pollEvents);
              }
            });
            lastEventCount = events.length;
          }
        } catch (err) {
          console.error('Poll events error:', err);
        }
      }, 3000);

      setTimeout(() => clearInterval(pollEvents), 60000);
    } catch (err) {
      addEvent(expId, createEvent('failed', '启动失败: ' + (err as Error).message));
      updateStatus(expId, 'failed');
    }
  }

  const addEvent = (id: string, event: any) => {
    setExperiments(prev => prev.map(exp =>
      exp.id === id ? { ...exp, events: [...exp.events, event] } : exp
    ))
  }

  const updateStatus = (id: string, status: Experiment['status']) => {
    setExperiments(prev => prev.map(exp => exp.id === id ? { ...exp, status } : exp))

    // Auto-generate skill on success
    if (status === 'success') {
      const exp = experiments.find(e => e.id === id)
      if (exp) {
        const skill = generateSkillDraft(exp)
        const newSkills = [...skills, skill]
        setSkills(newSkills)
        saveSkills(newSkills)
      }
    }
  }

  const handleResume = async () => {
    const exp = experiments.find(e => e.id === selectedId)
    if (!exp) return

    addEvent(selectedId, createEvent('human_continue', '👤 人工决策：继续执行'))

    if (!runnerRef.current) {
      runnerRef.current = createRunner(runnerType)
      updateStatus(selectedId, 'running')
      await runnerRef.current.start(exp, (event) => {
        addEvent(selectedId, event)
        if (event.type === 'success' || event.type === 'failed') {
          updateStatus(selectedId, event.type)
          runnerRef.current = null
        }
      })
    } else {
      updateStatus(selectedId, 'running')
      await runnerRef.current.resume()
    }
  }

  const handlePause = async () => {
    if (runnerRef.current) {
      await runnerRef.current.pause()
      updateStatus(selectedId, 'paused')
    }
  }

  const handleStop = async () => {
    addEvent(selectedId, createEvent('human_stop', '👤 人工决策：停止实验'))

    if (backendExperimentId) {
      try {
        await api.stopExperiment(backendExperimentId);
        addEvent(selectedId, createEvent('stop', '后端实验已停止'));
        updateStatus(selectedId, 'failed');
        setBackendExperimentId('');
      } catch (err) {
        addEvent(selectedId, createEvent('failed', '停止失败: ' + (err as Error).message));
      }
    } else if (runnerRef.current) {
      await runnerRef.current.stop();
      updateStatus(selectedId, 'failed');
      runnerRef.current = null;
    }
  }

  const handleRetry = async () => {
    const exp = experiments.find(e => e.id === selectedId);
    if (!exp || !backendExperimentId) return;

    addEvent(selectedId, createEvent('human_retry', '👤 人工决策：重试实验'))

    try {
      const result = await api.retryExperiment(backendExperimentId);
      addEvent(selectedId, createEvent('action', `重试实验: ${result.id}`));
      setBackendExperimentId(result.id);
      updateStatus(selectedId, 'running');
    } catch (err) {
      addEvent(selectedId, createEvent('failed', '重试失败: ' + (err as Error).message));
    }
  }

  const handleMarkSuccess = () => {
    if (runnerRef.current) {
      runnerRef.current.stop()
      runnerRef.current = null
    }
    addEvent(selectedId, createEvent('success', '手动标记为成功'))
    updateStatus(selectedId, 'success')
  }

  const handleMarkFailed = () => {
    if (runnerRef.current) {
      runnerRef.current.stop()
      runnerRef.current = null
    }
    addEvent(selectedId, createEvent('failed', '手动标记为失败'))
    updateStatus(selectedId, 'failed')
  }

  const handleGenerateSkill = () => {
    const exp = experiments.find(e => e.id === selectedId)
    if (exp) {
      const skill = generateSkillDraft(exp)
      const newSkills = [...skills, skill]
      setSkills(newSkills)
      saveSkills(newSkills)
      alert('技能草稿已生成')
    }
  }

  const runningExps = experiments.filter(e => e.status === 'running').length
  const completedExps = experiments.filter(e => e.status === 'success' || e.status === 'failed').length

  const StatCard = ({ label, value, color }: { label: string; value: number | string; color: string }) => (
    <div style={{ background: 'white', border: `1px solid ${color}30`, borderTop: `3px solid ${color}`, borderRadius: 8, padding: '12px 20px', minWidth: 120, textAlign: 'center' }}>
      <div style={{ fontSize: 28, fontWeight: 700, color }}>{value}</div>
      <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>{label}</div>
    </div>
  )

  return (
    <div style={{ padding: '20px', background: '#f8fafc', minHeight: '100vh' }}>
      <div style={{ background: 'white', borderRadius: 10, padding: '16px 20px', marginBottom: 20, boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>AgentLab</h1>
            <div style={{ fontSize: 13, color: '#6b7280', marginTop: 4 }}>Agent 实验编排与观察平台 · 连接 OpenClaw 执行 Runtime</div>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {selectedRuntimeId ? (
              <span style={{ padding: '6px 12px', borderRadius: 6, fontSize: 13, fontWeight: 600, background: selectedRuntimeMode === 'real' ? '#d1fae5' : '#f3f4f6', color: selectedRuntimeMode === 'real' ? '#065f46' : '#374151', border: selectedRuntimeMode === 'real' ? '1px solid #10b981' : '1px solid #d1d5db' }}>
                {selectedRuntimeMode === 'real' ? '🟢' : '⚪'} {selectedRuntimeId.slice(0, 8)}
              </span>
            ) : (
              <span style={{ padding: '6px 12px', borderRadius: 6, fontSize: 13, fontWeight: 600, background: '#fef3c7', color: '#92400e', border: '1px solid #fbbf24' }}>
                ⚠️ 未连接
              </span>
            )}
            <button onClick={() => setView('runtime')} style={{ padding: '6px 14px', fontSize: 13, border: '1px solid #3b82f6', borderRadius: 6, cursor: 'pointer', background: selectedRuntimeId ? 'white' : '#3b82f6', color: selectedRuntimeId ? '#3b82f6' : 'white', fontWeight: 600 }}>
              {selectedRuntimeId ? '切换 Runtime' : '连接 OpenClaw'}
            </button>
            <button onClick={() => setView('openclaw-debug')} style={{ padding: '6px 14px', fontSize: 13, border: '1px solid #d1d5db', borderRadius: 6, cursor: 'pointer', background: 'white' }}>调试</button>
            <button onClick={() => setView('settings')} style={{ padding: '6px 14px', fontSize: 13, border: '1px solid #d1d5db', borderRadius: 6, cursor: 'pointer', background: 'white' }}>设置</button>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <StatCard label="已连接 OpenClaw" value={selectedRuntimeId ? 1 : 0} color="#10b981" />
          <StatCard label="执行中实验" value={runningExps} color="#3b82f6" />
          <StatCard label="已完成实验" value={completedExps} color="#8b5cf6" />
          <StatCard label="总实验数" value={experiments.length} color="#6b7280" />
        </div>
      </div>
      {view === 'list' && <ExperimentList experiments={experiments} onSelect={id => { setSelectedId(id); setView('detail') }} onCreate={() => setView('create')} runtimes={runtimes} />}
      {view === 'create' && <ExperimentForm onSubmit={handleCreate} onCancel={() => setView('list')} selectedRuntimeId={selectedRuntimeId} selectedRuntimeMode={selectedRuntimeMode} />}
      {view === 'detail' && <ExperimentDetail
        experiment={experiments.find(e => e.id === selectedId)!}
        onBack={() => setView('list')}
        onResume={handleResume}
        onPause={handlePause}
        onStop={handleStop}
        onMarkSuccess={handleMarkSuccess}
        onMarkFailed={handleMarkFailed}
        onGenerateSkill={handleGenerateSkill}
        onStartWithBackend={() => handleStartWithBackend(selectedId)}
        onRetry={backendExperimentId ? handleRetry : undefined}
      />}
      {view === 'settings' && <Settings onBack={() => setView('list')} />}
      {view === 'openclaw-debug' && <OpenClawDebugPanel onBack={() => setView('list')} />}
      {view === 'runtime' && <RuntimeManager onBack={() => setView('list')} onSelectRuntime={(id, mode) => { setSelectedRuntimeId(id); setSelectedRuntimeMode(mode); setView('list'); }} recentExperiments={experiments.slice(-10).map(e => ({ id: e.id, name: e.name, runtime_id: e.runtime_id, status: e.status }))} />}
      {view === 'compare' && <CompareRuns onBack={() => setView('list')} />}
    </div>
  )
}

export default App
