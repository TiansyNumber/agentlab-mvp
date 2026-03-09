import { useState } from 'react'
import { Experiment } from './types'
import ExperimentList from './components/ExperimentList'
import ExperimentForm from './components/ExperimentForm'
import ExperimentDetail from './components/ExperimentDetail'

function App() {
  const [view, setView] = useState<'list' | 'create' | 'detail'>('list')
  const [selectedId, setSelectedId] = useState<string>('')
  const [experiments, setExperiments] = useState<Experiment[]>([
    {
      id: '1',
      name: '测试实验',
      status: 'running',
      createdAt: '2026-03-09 10:00',
      events: [
        { id: 'e1', timestamp: '10:00:00', type: 'start', message: '实验开始' },
        { id: 'e2', timestamp: '10:05:00', type: 'action', message: '执行任务A' }
      ]
    }
  ])

  const handleCreate = (name: string) => {
    const newExp: Experiment = {
      id: Date.now().toString(),
      name,
      status: 'running',
      createdAt: new Date().toLocaleString('zh-CN'),
      events: [{ id: 'e1', timestamp: new Date().toLocaleTimeString(), type: 'start', message: '实验开始' }]
    }
    setExperiments([...experiments, newExp])
    setView('list')
  }

  const handleIntervene = () => {
    const exp = experiments.find(e => e.id === selectedId)
    if (exp) {
      exp.events.push({
        id: Date.now().toString(),
        timestamp: new Date().toLocaleTimeString(),
        type: 'intervention',
        message: '人工介入'
      })
      setExperiments([...experiments])
    }
  }

  return (
    <div style={{ padding: '20px' }}>
      <h1>AgentLab MVP</h1>
      {view === 'list' && <ExperimentList experiments={experiments} onSelect={id => { setSelectedId(id); setView('detail') }} onCreate={() => setView('create')} />}
      {view === 'create' && <ExperimentForm onSubmit={handleCreate} onCancel={() => setView('list')} />}
      {view === 'detail' && <ExperimentDetail experiment={experiments.find(e => e.id === selectedId)!} onBack={() => setView('list')} onIntervene={handleIntervene} />}
    </div>
  )
}

export default App
