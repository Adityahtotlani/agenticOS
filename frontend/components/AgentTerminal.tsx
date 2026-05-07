'use client'

import { useEffect, useRef, useState } from 'react'
import { Play, Pause, RotateCcw } from 'lucide-react'

interface AgentTerminalProps {
  agentId: number
  taskId: number | null
}

export default function AgentTerminal({ agentId, taskId }: AgentTerminalProps) {
  const [output, setOutput] = useState<string>('')
  const [isStreaming, setIsStreaming] = useState(false)
  const terminalRef = useRef<HTMLDivElement>(null)
  const wsRef = useRef<WebSocket | null>(null)

  useEffect(() => {
    if (!taskId) return

    const connectWebSocket = () => {
      const ws = new WebSocket(`ws://localhost:8000/ws/agents/${agentId}/stream`)

      ws.onopen = () => {
        setIsStreaming(true)
        setOutput('')
        ws.send(JSON.stringify({ task_id: taskId }))
      }

      ws.onmessage = (event) => {
        const data = JSON.parse(event.data)

        if (data.type === 'output') {
          setOutput(prev => prev + data.chunk)
        } else if (data.type === 'done') {
          setIsStreaming(false)
        } else if (data.type === 'error') {
          setOutput(prev => prev + `\nERROR: ${data.message}`)
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
  }, [output])

  const handleClear = () => {
    setOutput('')
  }

  const handlePause = () => {
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
            onClick={handlePause}
            disabled={!isStreaming}
            className="p-1 hover:bg-gray-700 rounded disabled:opacity-50 disabled:cursor-not-allowed"
            title="Pause"
          >
            <Pause size={16} />
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
        className="flex-1 overflow-y-auto p-4 font-mono text-sm text-gray-100 whitespace-pre-wrap"
      >
        {output || <span className="text-gray-500">Waiting for output...</span>}
      </div>
    </div>
  )
}
