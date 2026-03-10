import { Experiment } from '../types'

interface Props {
  experiments: Experiment[]
  onSelect: (id: string) => void
  onCreate: () => void
  runtimes?: Array<{ id: string; mode: string; status: string }>
}

export default function ExperimentList({ experiments, onSelect, onCreate, runtimes = [] }: Props) {
  const statusColor = (status: string) => ({
    draft: '#999',
    running: '#2196F3',
    paused: '#FF9800',
    success: '#4CAF50',
    failed: '#F44336'
  }[status] || '#999')

  const statusLabel = (status: string) => ({
    draft: '草稿',
    running: '运行中',
    paused: '已暂停',
    success: '成功',
    failed: '失败'
  }[status] || status)

  const getRuntimeInfo = (runtimeId?: string) => {
    if (!runtimeId) return null;
    return runtimes.find(r => r.id === runtimeId);
  };

  const getRuntimeModeLabel = (mode: string) => {
    const labels: Record<string, string> = { demo: '🎭 Demo', simulated: '🔧 Sim', real: '🟢 Real' };
    return labels[mode] || mode;
  };

  const running = experiments.filter(e => e.status === 'running');
  const pending = experiments.filter(e => e.status === 'draft');
  const done = experiments.filter(e => e.status === 'success' || e.status === 'failed' || e.status === 'paused');

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
        <h2>实验调度中心</h2>
        <button onClick={onCreate} style={{ backgroundColor: '#2196F3', color: 'white', padding: '8px 16px', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>+ 创建实验</button>
      </div>

      {/* Summary bar */}
      <div style={{ display: 'flex', gap: '15px', marginBottom: '20px', padding: '10px', backgroundColor: '#f5f5f5', borderRadius: '6px' }}>
        <span style={{ color: '#2196F3', fontWeight: 'bold' }}>▶ 运行中: {running.length}</span>
        <span style={{ color: '#999' }}>◦ 待执行: {pending.length}</span>
        <span style={{ color: '#666' }}>✓ 已完成: {done.length}</span>
      </div>

      {experiments.length === 0 ? (
        <p style={{ color: '#999', textAlign: 'center', padding: '40px 0' }}>暂无实验，点击"创建实验"开始</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {experiments.map(exp => {
            const runtime = getRuntimeInfo(exp.runtimeId);
            return (
              <div key={exp.id} onClick={() => onSelect(exp.id)} style={{
                padding: '15px',
                border: `1px solid ${exp.status === 'running' ? '#2196F3' : '#ddd'}`,
                borderLeft: `4px solid ${statusColor(exp.status)}`,
                borderRadius: '4px',
                cursor: 'pointer',
                backgroundColor: exp.status === 'running' ? '#f0f7ff' : '#fafafa'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px' }}>
                  <strong style={{ fontSize: '1.05em' }}>{exp.name}</strong>
                  <span style={{
                    color: 'white',
                    backgroundColor: statusColor(exp.status),
                    padding: '2px 8px',
                    borderRadius: '4px',
                    fontSize: '0.85em'
                  }}>{statusLabel(exp.status)}</span>
                </div>
                <p style={{ margin: '5px 0', color: '#666', fontSize: '0.9em' }}>{exp.description}</p>
                <div style={{ display: 'flex', gap: '10px', marginTop: '8px', fontSize: '0.85em', color: '#888' }}>
                  <span>创建: {exp.createdAt}</span>
                  {runtime && (
                    <span style={{ color: runtime.mode === 'real' ? '#4CAF50' : '#888' }}>
                      Runtime: {getRuntimeModeLabel(runtime.mode)}
                    </span>
                  )}
                  {exp.events.length > 0 && <span>{exp.events.length} 个事件</span>}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  )
}
