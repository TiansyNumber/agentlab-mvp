import { useState, useEffect } from 'react'
import { Experiment, SkillDraft, Event } from './types'
import ExperimentList from './components/ExperimentList'
import ExperimentForm from './components/ExperimentForm'
import ExperimentDetail from './components/ExperimentDetail'
import { saveExperiments, loadExperiments, saveSkills, loadSkills, generateSkillDraft } from './utils'

function App() {
  const [view, setView] = useState<'list' | 'create' | 'detail'>('list')
  const [selectedId, setSelectedId] = useState<string>('')
  const [experiments, setExperiments] = useState<Experiment[]>([])
  const [skills, setSkills] = useState<SkillDraft[]>([])

  useEffect(() => {
    setExperiments(loadExperiments())
    setSkills(loadSkills())
  }, [])

  useEffect(() => {
    saveExperiments(experiments)
  }, [experiments])

  const handleCreate = (data: any) => {
    const newExp: Experiment = {
      id: Date.now().toString(),
      ...data,
      status: 'draft' as const,
      createdAt: new Date().toLocaleString('zh-CN'),
      events: [{ id: 'e1', timestamp: new Date().toLocaleTimeString(), type: 'start', message: '实验创建' }]
    }
    setExperiments([...experiments, newExp])
    setView('list')
  }

  const updateExperiment = (id: string, status: Experiment['status'], eventType: Event['type'], message: string) => {
    setExperiments(prev => prev.map(exp => {
      if (exp.id === id) {
        const newEvent: Event = {
          id: Date.now().toString(),
          timestamp: new Date().toLocaleTimeString(),
          type: eventType,
          message
        }
        return {
          ...exp,
          status,
          events: [...exp.events, newEvent]
        }
      }
      return exp
    }))
  }

  const handleResume = () => updateExperiment(selectedId, 'running', 'resume', '继续执行')
  const handlePause = () => updateExperiment(selectedId, 'paused', 'pause', '暂停执行')
  const handleStop = () => updateExperiment(selectedId, 'failed', 'stop', '停止执行')
  const handleMarkSuccess = () => updateExperiment(selectedId, 'success', 'success', '标记为成功')
  const handleMarkFailed = () => updateExperiment(selectedId, 'failed', 'failed', '标记为失败')

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
      <h1>AgentLab MVP</h1>
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
      />}
    </div>
  )
}

export default App
