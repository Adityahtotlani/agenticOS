'use client'

import { useEffect, useRef, useState } from 'react'
import { RotateCcw, Zap, CheckCircle, MessageCircle, ShieldAlert, Send, Check, X } from 'lucide-react'
import { getWebSocketUrl } from '@/lib/api'
import { TerminalEntry } from '@/types'

interface AgentTerminalProps {
  agentId: number
  taskId: number | null
}

export default function AgentTerminal({ agentId, taskId }: AgentTerminalProps) {
  const [entries, setEntries] = useState<TerminalEntry[]>([])
  const [isStreaming, setIsStreaming] = useState(false)
  const terminalRef = useRef<HTMLDivElement>(null)
  const wsRef = useRef<WebSocket | null>(null)

  useEffect(() => {
    if (!taskId) return

    const connectWebSocket = () => {
      const ws = new WebSocket(getWebSocketUrl(`/ws/agents/${agentId}/stream`))

      ws.onopen = () => {
        setIsStreaming(true)
        setEntries([])
        ws.send(JSON.stringify({ task_id: taskId }))
      }

      ws.onmessage = (event) => {
        const data = JSON.parse(event.data)

        if (data.type === 'output') {
          setEntries(prev => {
            const last = prev[prev.length - 1]
            if (last && last.type === 'text') {
              return [
                ...prev.slice(0, -1),
                { type: 'text', content: last.content + data.chunk },
              ]
            }
            return [...prev, { type: 'text', content: data.chunk }]
          })
        } else if (data.type === 'tool_call') {
          setEntries(prev => [
            ...prev,
            { type: 'tool_call', name: data.name, input: data.input },
          ])
        } else if (data.type === 'tool_result') {
          setEntries(prev => [
            ...prev,
            { type: 'tool_result', name: data.name, result: data.result },
          ])
        } else if (data.type === 'prompt_user') {
          setEntries(prev => [
            ...prev,
            {
              type: 'prompt',
              requestId: data.request_id,
              question: data.question,
              pending: true,
            },
          ])
        } else if (data.type === 'tool_approval_request') {
          setEntries(prev => [
            ...prev,
            {
              type: 'approval',
              requestId: data.request_id,
              toolName: data.name,
              input: data.input,
              pending: true,
            },
          ])
        } else if (data.type === 'tool_denied') {
          // Already reflected locally when user clicked Deny — no-op.
        } else if (data.type === 'user_answer') {
          // Server echo — local entry already updated.
        } else if (data.type === 'done') {
          setIsStreaming(false)
        } else if (data.type === 'error') {
          setEntries(prev => [
            ...prev,
            { type: 'error', content: `ERROR: ${data.message}` },
          ])
          setIsStreaming(false)
        }
      }

      ws.onerror = (err) => {
        console.error('WebSocket error:', err)
        setIsStreaming(false)
      }

      ws.onclose = () => {
        setIsStreaming(false)
      }

      wsRef.current = ws
    }

    connectWebSocket()
    return () => {
      wsRef.current?.close()
    }
  }, [agentId, taskId])

  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight
    }
  }, [entries])

  const sendResponse = (payload: Record<string, unknown>) => {
    const ws = wsRef.current
    if (!ws || ws.readyState !== WebSocket.OPEN) return
    ws.send(JSON.stringify({ type: 'user_response', ...payload }))
  }

  const submitPrompt = (requestId: string, answer: string) => {
    setEntries(prev =>
      prev.map(e =>
        e.type === 'prompt' && e.requestId === requestId
          ? { ...e, pending: false, answer }
          : e,
      ),
    )
    sendResponse({ request_id: requestId, answer })
  }

  const submitApproval = (requestId: string, approved: boolean, reason: string) => {
    setEntries(prev =>
      prev.map(e =>
        e.type === 'approval' && e.requestId === requestId
          ? { ...e, pending: false, decision: approved ? 'approved' : 'denied', reason }
          : e,
      ),
    )
    sendResponse({ request_id: requestId, approved, reason })
  }

  const handleClear = () => setEntries([])
  const handleStop = () => {
    wsRef.current?.close()
    setIsStreaming(false)
  }

  return (
    <div className="flex-1 flex flex-col bg-black rounded-lg border border-gray-700">
      <div className="flex items-center justify-between p-3 border-b border-gray-700 bg-gray-800">
        <span className="text-xs text-gray-400">{isStreaming ? '● Running' : '○ Ready'}</span>
        <div className="flex gap-2">
          <button
            onClick={handleStop}
            disabled={!isStreaming}
            className="p-1 hover:bg-gray-700 rounded disabled:opacity-50 disabled:cursor-not-allowed"
            title="Stop"
          >
            <div className="w-4 h-4 bg-red-600 rounded" />
          </button>
          <button
            onClick={handleClear}
            className="p-1 hover:bg-gray-700 rounded"
            title="Clear"
          >
            <RotateCcw size={16} />
          </button>
        </div>
      </div>

      <div ref={terminalRef} className="flex-1 overflow-y-auto p-4 space-y-2">
        {entries.length === 0 ? (
          <span className="text-gray-500 text-sm">Waiting for output...</span>
        ) : (
          entries.map((entry, idx) => {
            if (entry.type === 'text') {
              return (
                <div
                  key={idx}
                  className="font-mono text-sm text-gray-100 whitespace-pre-wrap"
                >
                  {entry.content}
                </div>
              )
            }
            if (entry.type === 'tool_call') {
              return (
                <div
                  key={idx}
                  className="flex items-center gap-2 bg-yellow-900/20 border border-yellow-700/50 rounded px-3 py-2"
                >
                  <Zap size={14} className="text-yellow-500" />
                  <span className="text-sm text-yellow-200">
                    <span className="font-semibold">{entry.name}</span>{' '}
                    <span className="text-yellow-100 text-xs">
                      {entry.input.length > 100 ? entry.input.slice(0, 100) + '...' : entry.input}
                    </span>
                  </span>
                </div>
              )
            }
            if (entry.type === 'tool_result') {
              return (
                <div
                  key={idx}
                  className="flex items-center gap-2 bg-green-900/20 border border-green-700/50 rounded px-3 py-2"
                >
                  <CheckCircle size={14} className="text-green-500" />
                  <span className="text-sm text-green-200">
                    <span className="font-semibold">{entry.name}</span>{' '}
                    <span className="text-green-100 text-xs">
                      {entry.result.length > 100 ? entry.result.slice(0, 100) + '...' : entry.result}
                    </span>
                  </span>
                </div>
              )
            }
            if (entry.type === 'error') {
              return (
                <div
                  key={idx}
                  className="font-mono text-sm text-red-400 bg-red-900/10 px-3 py-2 rounded"
                >
                  {entry.content}
                </div>
              )
            }
            if (entry.type === 'prompt') {
              return <PromptEntry key={idx} entry={entry} onSubmit={submitPrompt} />
            }
            if (entry.type === 'approval') {
              return <ApprovalEntry key={idx} entry={entry} onDecide={submitApproval} />
            }
            return null
          })
        )}
      </div>
    </div>
  )
}

function PromptEntry({
  entry,
  onSubmit,
}: {
  entry: Extract<TerminalEntry, { type: 'prompt' }>
  onSubmit: (requestId: string, answer: string) => void
}) {
  const [draft, setDraft] = useState('')
  return (
    <div className="bg-blue-900/20 border border-blue-700/50 rounded px-3 py-3 space-y-2">
      <div className="flex items-start gap-2">
        <MessageCircle size={14} className="text-blue-400 mt-0.5" />
        <span className="text-sm text-blue-100 font-medium whitespace-pre-wrap">{entry.question}</span>
      </div>
      {entry.pending ? (
        <form
          onSubmit={(e) => {
            e.preventDefault()
            if (!draft.trim()) return
            onSubmit(entry.requestId, draft.trim())
          }}
          className="flex gap-2 pl-6"
        >
          <input
            type="text"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            autoFocus
            placeholder="Type your answer..."
            className="flex-1 px-3 py-1.5 bg-gray-900 border border-blue-700/50 rounded text-sm focus:outline-none focus:border-blue-500"
          />
          <button
            type="submit"
            disabled={!draft.trim()}
            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded text-sm flex items-center gap-1"
          >
            <Send size={14} />
            Send
          </button>
        </form>
      ) : (
        <div className="pl-6 text-sm text-blue-200/80">
          <span className="text-blue-400">→ </span>
          <span className="whitespace-pre-wrap">{entry.answer}</span>
        </div>
      )}
    </div>
  )
}

function ApprovalEntry({
  entry,
  onDecide,
}: {
  entry: Extract<TerminalEntry, { type: 'approval' }>
  onDecide: (requestId: string, approved: boolean, reason: string) => void
}) {
  const [reason, setReason] = useState('')
  const inputPretty = JSON.stringify(entry.input, null, 2)
  return (
    <div className="bg-orange-900/20 border border-orange-700/50 rounded px-3 py-3 space-y-2">
      <div className="flex items-start gap-2">
        <ShieldAlert size={14} className="text-orange-400 mt-0.5" />
        <span className="text-sm text-orange-100">
          Agent wants to run <span className="font-semibold">{entry.toolName}</span>
          {entry.pending ? ' — approve?' : ''}
        </span>
      </div>
      <pre className="ml-6 text-xs text-orange-100/70 bg-black/30 rounded p-2 overflow-x-auto max-h-40">
        {inputPretty}
      </pre>
      {entry.pending ? (
        <div className="ml-6 flex flex-col gap-2">
          <input
            type="text"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Optional reason (shown to agent if denied)"
            className="px-3 py-1.5 bg-gray-900 border border-orange-700/50 rounded text-sm focus:outline-none focus:border-orange-500"
          />
          <div className="flex gap-2">
            <button
              onClick={() => onDecide(entry.requestId, true, reason)}
              className="flex items-center gap-1 px-3 py-1.5 bg-green-700 hover:bg-green-600 rounded text-sm"
            >
              <Check size={14} />
              Approve
            </button>
            <button
              onClick={() => onDecide(entry.requestId, false, reason)}
              className="flex items-center gap-1 px-3 py-1.5 bg-red-700 hover:bg-red-600 rounded text-sm"
            >
              <X size={14} />
              Deny
            </button>
          </div>
        </div>
      ) : (
        <div className="ml-6 text-sm">
          {entry.decision === 'approved' ? (
            <span className="text-green-400">✓ Approved{entry.reason ? ` — ${entry.reason}` : ''}</span>
          ) : (
            <span className="text-red-400">✕ Denied{entry.reason ? ` — ${entry.reason}` : ''}</span>
          )}
        </div>
      )}
    </div>
  )
}
