import { useState } from 'react'
import { api, CompareResult } from '../services/api'

interface Props {
  onBack: () => void
}

export default function CompareRuns({ onBack }: Props) {
  const [ids, setIds] = useState(['', ''])
  const [result, setResult] = useState<CompareResult | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const addId = () => setIds([...ids, ''])
  const updateId = (i: number, v: string) => setIds(ids.map((x, idx) => idx === i ? v : x))
  const removeId = (i: number) => setIds(ids.filter((_, idx) => idx !== i))

  const handleCompare = async () => {
    const validIds = ids.map(s => s.trim()).filter(Boolean)
    if (validIds.length < 2) { setError('至少需要 2 个 experiment ID'); return }
    setError('')
    setLoading(true)
    try {
      const r = await api.compareExperiments(validIds)
      setResult(r)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  const fmt = (ms?: number) => ms !== undefined ? `${(ms / 1000).toFixed(1)}s` : '-'
  const statusColor = (s: string) => s === 'completed' ? '#22c55e' : s === 'failed' ? '#ef4444' : s === 'stopped' ? '#f59e0b' : '#94a3b8'

  return (
    <div style={{ maxWidth: 900 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <button onClick={onBack}>← 返回</button>
        <h2 style={{ margin: 0 }}>Compare Runs</h2>
      </div>

      <div style={{ marginBottom: 16 }}>
        {ids.map((id, i) => (
          <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
            <input
              value={id}
              onChange={e => updateId(i, e.target.value)}
              placeholder={`Experiment ID ${i + 1}`}
              style={{ flex: 1, padding: '6px 10px', fontFamily: 'monospace', fontSize: 13 }}
            />
            {ids.length > 2 && (
              <button onClick={() => removeId(i)} style={{ color: '#ef4444' }}>✕</button>
            )}
          </div>
        ))}
        <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
          <button onClick={addId}>+ 添加</button>
          <button onClick={handleCompare} disabled={loading} style={{ background: '#3b82f6', color: '#fff', border: 'none', padding: '6px 16px', cursor: 'pointer' }}>
            {loading ? '比较中...' : '开始比较'}
          </button>
        </div>
        {error && <div style={{ color: '#ef4444', marginTop: 8 }}>{error}</div>}
      </div>

      {result && (
        <div>
          {/* Summary */}
          <div style={{ background: '#1e293b', color: '#e2e8f0', padding: 16, borderRadius: 8, marginBottom: 16, display: 'flex', gap: 24, flexWrap: 'wrap' }}>
            <span>✅ 成功: <b>{result.comparison.success_count}</b></span>
            <span>❌ 失败: <b>{result.comparison.failure_count}</b></span>
            <span>⏹ 停止: <b>{result.comparison.stopped_count}</b></span>
            <span>⏱ 平均耗时: <b>{fmt(result.comparison.avg_duration_ms)}</b></span>
            <span>⚡ 最快: <b>{fmt(result.comparison.min_duration_ms)}</b></span>
            <span>🐢 最慢: <b>{fmt(result.comparison.max_duration_ms)}</b></span>
            <span>同任务: <b>{result.comparison.all_same_task ? '是' : '否'}</b></span>
            <span>同 Runtime: <b>{result.comparison.all_same_runtime ? '是' : '否'}</b></span>
          </div>

          {/* Failure stages */}
          {Object.keys(result.comparison.failure_stages).length > 0 && (
            <div style={{ background: '#fef2f2', border: '1px solid #fecaca', padding: 12, borderRadius: 6, marginBottom: 16 }}>
              <b>失败阶段分布：</b>
              {Object.entries(result.comparison.failure_stages).map(([stage, count]) => (
                <span key={stage} style={{ marginLeft: 12 }}>{stage}: {count}</span>
              ))}
            </div>
          )}

          {/* Per-experiment table */}
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#f1f5f9', textAlign: 'left' }}>
                <th style={{ padding: '8px 10px' }}>ID</th>
                <th style={{ padding: '8px 10px' }}>Runtime</th>
                <th style={{ padding: '8px 10px' }}>Status</th>
                <th style={{ padding: '8px 10px' }}>Phase</th>
                <th style={{ padding: '8px 10px' }}>Duration</th>
                <th style={{ padding: '8px 10px' }}>Events</th>
                <th style={{ padding: '8px 10px' }}>Failure Stage</th>
                <th style={{ padding: '8px 10px' }}>Final Result</th>
              </tr>
            </thead>
            <tbody>
              {result.experiments.map((e, i) => (
                <tr key={e.id} style={{ borderBottom: '1px solid #e2e8f0', background: i % 2 === 0 ? '#fff' : '#f8fafc' }}>
                  <td style={{ padding: '8px 10px', fontFamily: 'monospace', fontSize: 11 }}>
                    {e.id.slice(0, 8)}…
                    {e.id === result.comparison.fastest_id && <span style={{ marginLeft: 4, color: '#22c55e' }}>⚡</span>}
                    {e.id === result.comparison.slowest_id && <span style={{ marginLeft: 4, color: '#f59e0b' }}>🐢</span>}
                  </td>
                  <td style={{ padding: '8px 10px', fontFamily: 'monospace', fontSize: 11 }}>{e.runtime_id.slice(0, 8)}…</td>
                  <td style={{ padding: '8px 10px' }}>
                    <span style={{ color: statusColor(e.status), fontWeight: 'bold' }}>{e.status}</span>
                  </td>
                  <td style={{ padding: '8px 10px', color: '#64748b' }}>{e.phase || '-'}</td>
                  <td style={{ padding: '8px 10px' }}>{fmt(e.duration_ms)}</td>
                  <td style={{ padding: '8px 10px', textAlign: 'center' }}>{e.event_count}</td>
                  <td style={{ padding: '8px 10px', color: '#ef4444', fontSize: 11 }}>{e.failure_reason || '-'}</td>
                  <td style={{ padding: '8px 10px', fontSize: 11, color: '#475569', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {e.final_result || '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
