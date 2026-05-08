'use client'

import { useEffect, useRef, useState } from 'react'
import { RotateCcw, Zap, CheckCircle } from 'lucide-react'
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
  const currentTextRef = useRef<string>('')

  useEffect(() => {
    if (!taskId) return

    const connectWebSocket = () => {
      const ws = new WebSocket(`ws://localhost:8000/ws/agents/${agentId}/stream`)

      ws.onopen = () => {
        setIsStreaming(true)
        setEntries([])
        currentTextRef.current = ''
        ws.send(JSON.stringify({ task_id: taskId }))
      }

      ws.onmessage = (event) => {
        const data = JSON.parse(event.data)

        if (data.type === 'output') {
          currentTextRef.current += data.chunk
          setEntries(prev => {
            const newEntries = [...prev]
            const lastEntry = newEntries[newEntries.length - 1]

            if (lastEntry && lastEntry.type === 'text') {
              lastEntry.content += data.chunk
            } else {
              newEntries.push({ type: 'text', content: data.chunk })
            }
            return newEntries
          })
        } else if (data.type === 'tool_call') {
          setEntries(prev => [...prev, {
            type: 'tool_call',
            name: data.name,
            input: data.input
          }])
        } else if (data.type === 'tool_result') {
          setEntries(prev => [...prev, {
            type: 'tool_result',
            name: data.name,
            result: data.result
          }])
        } else if (data.type === 'done') {
          setIsStreaming(false)
        } else if (data.type === 'error') {
          setEntries(prev => [...prev, { type: 'error', content: `ERROR: ${data.message}` }])
          setIsStreaming(false)
        }
      }

      ws.onerror = (error) => {
        console.error('WebSocket error:', error)
        setIsStreaming(false)
      }

      ws.onclose = () => {
        setIsStreaming(false)
      }

      wsRef.current = ws
    }

    connectWebSocket()

    return () => {
      if (wsRef.current) {
        wsRef.current.close()
      }
    }
  }, [agentId, taskId])

  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight
    }
  }, [entries])

  const handleClear = () => {
    setEntries([])
    currentTextRef.current = ''
  }

  const handleStop = () => {
    if (wsRef.current) {
      wsRef.current.close()
      setIsStreaming(false)
    }
  }

  return (
    <div className="flex-1 flex flex-col bg-black rounded-lg border border-gray-700">
      <div className="flex items-center justify-between p-3 border-b border-gray-700 bg-gray-800">
        <span className="text-xs text-gray-400">
          {isStreaming ? '● Running' : '○ Ready'}
        </span>
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

      <div
        ref={terminalRef}
        className="flex-1 overflow-y-auto p-4 space-y-2"
      >
        {entries.length === 0 ? (
          <span className="text-gray-500 text-sm">Waiting for output...</span>
        ) : (
          entries.map((entry, idx) => (
            <div key={idx}>
              {entry.type === 'text' && (
                <div className="font-mono text-sm text-gray-100 whitespace-pre-wrap">
                  {entry.content}
                </div>
              )}
              {entry.type === 'tool_call' && (
                <div className="flex items-center gap-2 bg-yellow-900/20 border border-yellow-700/50 rounded px-3 py-2">
                  <Zap size={14} className="text-yellow-500" />
                  <span className="text-sm text-yellow-200">
                    <span className="font-semibold">{entry.name}</span>
                    {' '}
                    <span className="text-yellow-100 text-xs">
                      {entry.input.length > 100 ? entry.input.slice(0, 100) + '...' : entry.input}
                    </span>
                  </span>
                </div>
              )}
              {entry.type === 'tool_result' && (
                <div className="flex items-center gap-2 bg-green-900/20 border border-green-700/50 rounded px-3 py-2">
                  <CheckCircle size={14} className="text-green-500" />
                  <span className="text-sm text-green-200">
                    <span className="font-semibold">{entry.name}</span>
                    {' '}
                    <span className="text-green-100 text-xs">
                      {entry.result.length > 100 ? entry.result.slice(0, 100) + '...' : entry.result}
                    </span>
                  </span>
                </div>
              )}
              {entry.type === 'error' && (
                <div className="font-mono text-sm text-red-400 bg-red-900/10 px-3 py-2 rounded">
                  {entry.content}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}
