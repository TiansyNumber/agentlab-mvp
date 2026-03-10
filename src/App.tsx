import { useState, useEffect, useRef } from 'react'
import { Experiment, SkillDraft } from './types'
import ExperimentList from './components/ExperimentList'
import ExperimentForm from './components/ExperimentForm'
import ExperimentDetail from './components/ExperimentDetail'
import Settings from './components/Settings'
import OpenClawDebugPanel from './components/OpenClawDebugPanel'
import RuntimeManager from './components/RuntimeManager'
import { saveExperiments, loadExperiments, saveSkills, loadSkills, generateSkillDraft } from './utils'
import { createEvent } from './services/experimentActions'
import { createRunner, RunnerType, IExperimentRunner } from './services/runners'
import { api } from './services/api'

function App() {
  const [view, setView] = useState<'list' | 'create' | 'detail' | 'settings' | 'openclaw-debug' | 'runtime'>('list')
  const [selectedId, setSelectedId] = useState<string>('')
  const [selectedRuntimeId, setSelectedRuntimeId] = useState<string>('')
  const [selectedRuntimeMode, setSelectedRuntimeMode] = useState<string>('')
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
    if (runnerRef.current) {
      await runnerRef.current.stop()
      updateStatus(selectedId, 'failed')
      runnerRef.current = null
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

  return (
    <div style={{ padding: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h1>AgentLab MVP</h1>
        <div>
          <label style={{ marginRight: '10px' }}>
            Runner:
            <select value={runnerType} onChange={(e) => setRunnerType(e.target.value as RunnerType)} style={{ marginLeft: '5px' }}>
              <option value="mock">Mock（模拟）</option>
              <option value="anthropic">Anthropic（直连 Claude API）</option>
              <option value="openclaw-bridge">OpenClaw Bridge（验证工具）</option>
            </select>
          </label>
          {selectedRuntimeId && (
            <span style={{ marginRight: 10, color: selectedRuntimeMode === 'real' ? 'green' : '#888', fontWeight: selectedRuntimeMode === 'real' ? 'bold' : 'normal' }}>
              {selectedRuntimeMode === 'real' ? '🟢 Real Runtime: ' : 'Runtime: '}{selectedRuntimeId.slice(0, 8)}
            </span>
          )}
          <button onClick={() => setView('runtime')} style={{ marginRight: 6 }}>Runtime 管理</button>
          <button onClick={() => setView('openclaw-debug')} style={{ marginRight: 6 }}>OpenClaw 调试</button>
          <button onClick={() => setView('settings')}>设置</button>
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
      />}
      {view === 'settings' && <Settings onBack={() => setView('list')} />}
      {view === 'openclaw-debug' && <OpenClawDebugPanel onBack={() => setView('list')} />}
      {view === 'runtime' && <RuntimeManager onBack={() => setView('list')} onSelectRuntime={(id, mode) => { setSelectedRuntimeId(id); setSelectedRuntimeMode(mode); setView('list'); }} />}
    </div>
  )
}

export default App
