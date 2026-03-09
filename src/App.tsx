import { useState, useEffect } from 'react'
import { Experiment, SkillDraft } from './types'
import ExperimentList from './components/ExperimentList'
import ExperimentForm from './components/ExperimentForm'
import ExperimentDetail from './components/ExperimentDetail'
import { saveExperiments, loadExperiments, saveSkills, loadSkills, generateSkillDraft } from './utils'
import { createEvent } from './services/experimentActions'

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
      events: [createEvent('start', '实验创建')]
    }
    setExperiments([...experiments, newExp])
    setView('list')
  }

  const updateExperiment = (id: string, status: Experiment['status'], message: string) => {
    const eventType = status === 'running' ? 'resume' : status === 'paused' ? 'pause' : status === 'success' ? 'success' : status === 'failed' ? 'failed' : 'stop'
    setExperiments(prev => prev.map(exp =>
      exp.id === id ? { ...exp, status, events: [...exp.events, createEvent(eventType, message)] } : exp
    ))
  }

  const handleResume = () => updateExperiment(selectedId, 'running', '继续执行')
  const handlePause = () => updateExperiment(selectedId, 'paused', '暂停执行')
  const handleStop = () => updateExperiment(selectedId, 'failed', '停止执行')
  const handleMarkSuccess = () => updateExperiment(selectedId, 'success', '标记为成功')
  const handleMarkFailed = () => updateExperiment(selectedId, 'failed', '标记为失败')

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
