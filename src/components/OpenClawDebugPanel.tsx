/**
 * OpenClawDebugPanel
 *
 * 本地 OpenClaw Gateway 调试面板。
 * 绕过实验表单，直接构造固定参数调用 OpenClawBrowserBridge，验证连通性。
 *
 * 能验证：
 * - WebSocket 是否能连上 Gateway
 * - connect 消息（含 token）是否被接受
 * - agent 消息是否能拿到响应
 * - 返回的 timeline 事件内容
 *
 * 不能验证：
 * - OpenClaw 内部 agent 逻辑是否正确
 * - 工具调用是否生效
 * - 流式事件（当前等待完整响应）
 */
import { useState, useRef } from 'react'
import { OpenClawBrowserBridge } from '../services/runners/OpenClawBrowserBridge'
import { Event } from '../types'

type Phase = 'idle' | 'running' | 'done'

interface DiagResult {
  phase: 'connect' | 'agent' | 'done'
  ok: boolean
  detail: string
}

const DEFAULT_GATEWAY = 'ws://localhost:18889'
const DEFAULT_MESSAGE = '你好，请回复一句话确认连接正常。'

export default function OpenClawDebugPanel({ onBack }: { onBack: () => void }) {
  const [gatewayUrl, setGatewayUrl] = useState(
    localStorage.getItem('openclaw_gateway_url') || DEFAULT_GATEWAY
  )
  const [token, setToken] = useState(
    localStorage.getItem('openclaw_gateway_token') || ''
  )
  const [message, setMessage] = useState(DEFAULT_MESSAGE)
  const [phase, setPhase] = useState<Phase>('idle')
  const [events, setEvents] = useState<Event[]>([])
  const [diag, setDiag] = useState<DiagResult[]>([])
  const runnerRef = useRef<OpenClawBrowserBridge | null>(null)

  const addEvent = (e: Event) => setEvents(prev => [...prev, e])
  const addDiag = (d: DiagResult) => setDiag(prev => [...prev, d])

  const handleRun = async () => {
    if (!token.trim()) {
      alert('请先填写 Gateway Token（从 openclaw config get gateway.auth 获取）')
      return
    }

    // 保存到 localStorage 供 OpenClawBrowserBridge 读取
    localStorage.setItem('openclaw_gateway_url', gatewayUrl)
    localStorage.setItem('openclaw_gateway_token', token)

    setEvents([])
    setDiag([])
    setPhase('running')

    // 先做一次原始 WebSocket 诊断，再走 OpenClawBrowserBridge 主路径
    await runDiagnostic(gatewayUrl, token, message)
  }

  const handleStop = async () => {
    if (runnerRef.current) {
      await runnerRef.current.stop()
      runnerRef.current = null
    }
    setPhase('done')
  }

  const runDiagnostic = async (url: string, tok: string, msg: string) => {
    // --- Phase 1: 原始 WS 诊断（不走 Runner，直接测连通性）---
    const connectResult = await testRawConnect(url, tok)
    addDiag(connectResult)

    if (!connectResult.ok) {
      setPhase('done')
      return
    }

    // --- Phase 2: 走 OpenClawBrowserBridge 主路径 ---
    addDiag({ phase: 'agent', ok: true, detail: '开始通过 OpenClawBrowserBridge 发送 agent 消息...' })

    const runner = new OpenClawBrowserBridge()
    runnerRef.current = runner

    // 构造最小实验对象
    const fakeExperiment = {
      id: 'debug-' + Date.now(),
      name: '[Debug] OpenClaw 连通性测试',
      description: msg,
      successCriteria: '连接正常',
      failureConditions: '连接失败',
      model: 'default',
      tools: [],
      maxSteps: 1,
      maxTokens: 10000,
      maxDuration: 60,
      status: 'draft' as const,
      createdAt: new Date().toLocaleString('zh-CN'),
      events: [],
    }

    let gotResponse = false
    let lastEventType = ''

    await runner.start(fakeExperiment, (event) => {
      addEvent(event)
      lastEventType = event.type
      if (event.type === 'success' || event.type === 'failed') {
        gotResponse = true
        const ok = event.type === 'success'
        addDiag({
          phase: 'done',
          ok,
          detail: ok
            ? `Agent 响应成功: ${event.message}`
            : `Agent 响应失败: ${event.message}`,
        })
      }
    })

    if (!gotResponse) {
      addDiag({
        phase: 'done',
        ok: false,
        detail: `Runner 结束但未收到 success/failed 事件（最后事件类型: ${lastEventType || '无'}）`,
      })
    }

    runnerRef.current = null
    setPhase('done')
  }

  return (
    <div style={{ maxWidth: 720, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <button onClick={onBack}>← 返回</button>
        <h2 style={{ margin: 0 }}>OpenClaw 本地调试面板</h2>
      </div>

      <div style={{ background: '#f5f5f5', padding: 16, borderRadius: 8, marginBottom: 20, fontSize: 13, color: '#555' }}>
        <strong>用途：</strong>绕过实验表单，直接验证 AgentLab → OpenClawBrowserBridge → 本地 Gateway 的连通性。<br />
        <strong>默认端口：</strong>18889 &nbsp;|&nbsp;
        <strong>获取 Token：</strong><code>openclaw config get gateway.auth</code>
      </div>

      {/* 配置区 */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <span style={{ fontWeight: 600, fontSize: 13 }}>Gateway URL</span>
          <input
            value={gatewayUrl}
            onChange={e => setGatewayUrl(e.target.value)}
            disabled={phase === 'running'}
            style={{ padding: '6px 10px', borderRadius: 4, border: '1px solid #ccc', fontFamily: 'monospace' }}
          />
        </label>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <span style={{ fontWeight: 600, fontSize: 13 }}>Gateway Token</span>
          <input
            type="password"
            value={token}
            onChange={e => setToken(e.target.value)}
            disabled={phase === 'running'}
            placeholder="从 openclaw config get gateway.auth 获取"
            style={{ padding: '6px 10px', borderRadius: 4, border: '1px solid #ccc', fontFamily: 'monospace' }}
          />
        </label>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <span style={{ fontWeight: 600, fontSize: 13 }}>测试消息</span>
          <input
            value={message}
            onChange={e => setMessage(e.target.value)}
            disabled={phase === 'running'}
            style={{ padding: '6px 10px', borderRadius: 4, border: '1px solid #ccc' }}
          />
        </label>
      </div>

      {/* 操作按钮 */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 24 }}>
        {phase !== 'running' ? (
          <button
            onClick={handleRun}
            style={{ padding: '8px 20px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 600 }}
          >
            运行测试
          </button>
        ) : (
          <button
            onClick={handleStop}
            style={{ padding: '8px 20px', background: '#dc2626', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 600 }}
          >
            停止
          </button>
        )}
        {phase === 'done' && (
          <button
            onClick={() => { setEvents([]); setDiag([]); setPhase('idle') }}
            style={{ padding: '8px 20px', background: '#6b7280', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' }}
          >
            清空
          </button>
        )}
      </div>

      {/* 诊断结果 */}
      {diag.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <h3 style={{ fontSize: 14, marginBottom: 8 }}>诊断结果</h3>
          {diag.map((d, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'flex-start', gap: 8, padding: '8px 12px',
              background: d.ok ? '#f0fdf4' : '#fef2f2',
              border: `1px solid ${d.ok ? '#86efac' : '#fca5a5'}`,
              borderRadius: 6, marginBottom: 6, fontSize: 13,
            }}>
              <span style={{ fontSize: 16, lineHeight: 1 }}>{d.ok ? '✅' : '❌'}</span>
              <div>
                <span style={{ fontWeight: 600, marginRight: 6 }}>
                  {d.phase === 'connect' ? 'WebSocket 连接' : d.phase === 'agent' ? 'Agent 调用' : '最终结果'}
                </span>
                <span style={{ color: '#374151' }}>{d.detail}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 事件时间线 */}
      {events.length > 0 && (
        <div>
          <h3 style={{ fontSize: 14, marginBottom: 8 }}>事件时间线</h3>
          <div style={{ background: '#1e1e1e', borderRadius: 8, padding: 16, maxHeight: 360, overflowY: 'auto' }}>
            {events.map(e => (
              <div key={e.id} style={{ marginBottom: 8, fontFamily: 'monospace', fontSize: 12 }}>
                <span style={{ color: '#6b7280', marginRight: 8 }}>{e.timestamp}</span>
                <span style={{ color: eventColor(e.type), marginRight: 8, fontWeight: 600 }}>[{e.type}]</span>
                <span style={{ color: '#d4d4d4' }}>{e.message}</span>
              </div>
            ))}
            {phase === 'running' && (
              <div style={{ color: '#facc15', fontFamily: 'monospace', fontSize: 12 }}>⏳ 等待响应...</div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function eventColor(type: Event['type']): string {
  switch (type) {
    case 'success': return '#4ade80'
    case 'failed': return '#f87171'
    case 'start': return '#60a5fa'
    case 'action': return '#facc15'
    case 'stop': return '#f87171'
    default: return '#a3a3a3'
  }
}

// 原始 WebSocket 诊断：只测 connect 握手，不走 Runner
async function testRawConnect(url: string, token: string): Promise<DiagResult> {
  return new Promise((resolve) => {
    let ws: WebSocket
    try {
      ws = new WebSocket(url)
    } catch (e) {
      resolve({ phase: 'connect', ok: false, detail: `WebSocket 构造失败: ${e}` })
      return
    }

    const timeout = setTimeout(() => {
      ws.close()
      resolve({ phase: 'connect', ok: false, detail: `连接超时（5s）：Gateway 未响应，请确认 openclaw gateway 正在运行` })
    }, 5000)

    ws.onopen = () => {
      ws.send(JSON.stringify({ id: 'diag-connect', method: 'connect', params: token ? { auth: { token } } : {} }))
    }

    ws.onmessage = (evt) => {
      clearTimeout(timeout)
      try {
        const msg = JSON.parse(evt.data)
        if (msg.id === 'diag-connect') {
          ws.close()
          if (msg.error) {
            resolve({ phase: 'connect', ok: false, detail: `connect 被拒绝: ${msg.error.message || JSON.stringify(msg.error)}（可能是 token 错误）` })
          } else {
            resolve({ phase: 'connect', ok: true, detail: `WebSocket 连接成功，connect 握手通过` })
          }
        }
      } catch {
        // ignore non-JSON
      }
    }

    ws.onerror = () => {
      clearTimeout(timeout)
      resolve({ phase: 'connect', ok: false, detail: `WebSocket 连接错误：Gateway 可能未启动（${url}）` })
    }

    ws.onclose = (evt) => {
      clearTimeout(timeout)
      if (evt.code !== 1000 && evt.code !== 1005) {
        resolve({ phase: 'connect', ok: false, detail: `连接被关闭（code: ${evt.code}）：${evt.reason || '无原因'}` })
      }
    }
  })
}
