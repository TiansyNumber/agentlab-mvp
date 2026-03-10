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
  const [runnerType, setRunnerType] = useState<RunnerType>('mock')
  const runnerRef = useRef<IExperimentRunner | null>(null)

  useEffect(() => {
    setExperiments(loadExperiments())
    setSkills(loadSkills())
  }, [])

  useEffect(() => {
    saveExperiments(experiments)
  }, [experiments])

  const handleCreate = async (data: any) => {
    const newExp: Experiment = {
      id: Date.now().toString(),
      ...data,
      status: 'draft' as const,
      createdAt: new Date().toLocaleString('zh-CN'),
      events: [createEvent('start', '实验创建')]
    }
    setExperiments([...experiments, newExp])
    setView('list')
  }

  const handleStartWithBackend = async (expId: string) => {
    if (!selectedRuntimeId) {
      alert('请先选择 Runtime');
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

      let lastEventCount = 0;
      const pollEvents = setInterval(async () => {
        try {
          const events = await api.getExperimentEvents(result.id);
          if (events.length > lastEventCount) {
            events.slice(lastEventCount).forEach(e => {
              const msg = typeof e.message === 'string' ? e.message : JSON.stringify(JSON.parse(e.message));
              addEvent(expId, createEvent('action', `[${e.type}] ${msg}`));

              if (e.type === 'experiment_completed') {
                updateStatus(expId, 'success');
                clearInterval(pollEvents);
              } else if (e.type === 'experiment_stopped') {
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
            <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>实验调度中心</div>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <label style={{ fontSize: 13, color: '#374151' }}>
              Runner:
              <select value={runnerType} onChange={(e) => setRunnerType(e.target.value as RunnerType)} style={{ marginLeft: 6, padding: '3px 6px', border: '1px solid #d1d5db', borderRadius: 4, fontSize: 13 }}>
                <option value="mock">Mock</option>
                <option value="anthropic">Anthropic</option>
                <option value="openclaw-bridge">OpenClaw Bridge</option>
              </select>
            </label>
            {selectedRuntimeId && (
              <span style={{ padding: '3px 10px', borderRadius: 4, fontSize: 12, fontWeight: 600, background: selectedRuntimeMode === 'real' ? '#d1fae5' : '#f3f4f6', color: selectedRuntimeMode === 'real' ? '#065f46' : '#374151' }}>
                {selectedRuntimeMode === 'real' ? '🟢' : '⚪'} {selectedRuntimeId.slice(0, 8)}
              </span>
            )}
            <button onClick={() => setView('runtime')} style={{ padding: '5px 12px', fontSize: 13, border: '1px solid #d1d5db', borderRadius: 4, cursor: 'pointer', background: 'white' }}>Runtime</button>
            <button onClick={() => setView('compare')} style={{ padding: '5px 12px', fontSize: 13, border: '1px solid #d1d5db', borderRadius: 4, cursor: 'pointer', background: 'white' }}>Compare</button>
            <button onClick={() => setView('openclaw-debug')} style={{ padding: '5px 12px', fontSize: 13, border: '1px solid #d1d5db', borderRadius: 4, cursor: 'pointer', background: 'white' }}>调试</button>
            <button onClick={() => setView('settings')} style={{ padding: '5px 12px', fontSize: 13, border: '1px solid #d1d5db', borderRadius: 4, cursor: 'pointer', background: 'white' }}>设置</button>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <StatCard label="在线 Runtime" value={selectedRuntimeId ? 1 : 0} color="#10b981" />
          <StatCard label="执行中实验" value={runningExps} color="#3b82f6" />
          <StatCard label="已完成实验" value={completedExps} color="#8b5cf6" />
          <StatCard label="总实验数" value={experiments.length} color="#6b7280" />
        </div>
      </div>
      {view === 'list' && <ExperimentList experiments={experiments} onSelect={id => { setSelectedId(id); setView('detail') }} onCreate={() => setView('create')} />}
      {view === 'create' && <ExperimentForm onSubmit={handleCreate} onCancel={() => setView('list')} />}
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
      {view === 'runtime' && <RuntimeManager onBack={() => setView('list')} onSelectRuntime={(id, mode) => { setSelectedRuntimeId(id); setSelectedRuntimeMode(mode); setView('list'); }} />}
      {view === 'compare' && <CompareRuns onBack={() => setView('list')} />}
    </div>
  )
}

export default App
