'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { API_BASE } from '@/lib/api'
import AgentTerminal from '@/components/AgentTerminal'
import { Agent, Task } from '@/types'

export default function AgentDetailPage() {
  const params = useParams()
  const agentId = parseInt(params.id as string)
  const [agent, setAgent] = useState<Agent | null>(null)
  const [tasks, setTasks] = useState<Task[]>([])
  const [children, setChildren] = useState<Agent[]>([])
  const [selectedTask, setSelectedTask] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchAgent()
    fetchTasks()
    fetchChildren()
    const interval = setInterval(fetchChildren, 3000)
    return () => clearInterval(interval)
  }, [agentId])

  const fetchAgent = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/agents/${agentId}`)
      setAgent(await res.json())
    } catch (error) {
      console.error('Failed to fetch agent:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchTasks = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/tasks`)
      setTasks(await res.json())
    } catch (error) {
      console.error('Failed to fetch tasks:', error)
    }
  }

  const fetchChildren = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/agents/${agentId}/children`)
      setChildren(await res.json())
    } catch (error) {
      console.error('Failed to fetch children:', error)
    }
  }

  const handlePause = async () => {
    try {
      await fetch(`${API_BASE}/api/agents/${agentId}/pause`, { method: 'POST' })
      fetchAgent()
    } catch (error) {
      console.error('Failed to pause agent:', error)
    }
  }

  const handleKill = async () => {
    try {
      await fetch(`${API_BASE}/api/agents/${agentId}/kill`, { method: 'POST' })
      fetchAgent()
    } catch (error) {
      console.error('Failed to kill agent:', error)
    }
  }

  if (loading || !agent) {
    return <div className="p-8 text-gray-400">Loading...</div>
  }

  const spent = agent.spent_usd ?? 0
  const budget = agent.budget_usd ?? null
  const overBudget = budget !== null && spent >= budget

  const handleRaiseBudget = async () => {
    const input = prompt('New budget (USD). Leave empty to remove cap.', budget?.toString() ?? '')
    if (input === null) return
    const value = input.trim() === '' ? null : parseFloat(input)
    try {
      await fetch(`${API_BASE}/api/agents/${agentId}/budget`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ budget_usd: value }),
      })
      fetchAgent()
    } catch (e) {
      console.error(e)
    }
  }

  return (
    <div className="p-8 flex flex-col h-screen">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">{agent.name}</h1>
        <div className="flex items-center gap-4 text-sm flex-wrap">
          <span className="text-gray-400">Model: {agent.model}</span>
          <span className={`px-2 py-1 rounded text-xs ${
            agent.status === 'idle' ? 'bg-green-900' :
            agent.status === 'running' ? 'bg-blue-900' :
            agent.status === 'paused' ? 'bg-yellow-900' :
            'bg-red-900'
          }`}>
            {agent.status}
          </span>
          <button
            onClick={handlePause}
            disabled={agent.status !== 'running'}
            className="px-3 py-1 bg-yellow-700 hover:bg-yellow-600 disabled:opacity-50 rounded text-xs transition-colors"
          >
            Pause
          </button>
          <button
            onClick={handleKill}
            className="px-3 py-1 bg-red-800 hover:bg-red-700 rounded text-xs transition-colors"
          >
            Kill
          </button>
          <button
            onClick={handleRaiseBudget}
            className={`px-3 py-1 rounded text-xs transition-colors ${
              overBudget ? 'bg-red-800 hover:bg-red-700' : 'bg-gray-700 hover:bg-gray-600'
            }`}
            title="Edit budget cap"
          >
            Spent ${spent.toFixed(spent < 1 ? 4 : 2)}
            {budget !== null && (
              <span className="opacity-70"> / ${budget.toFixed(2)}</span>
            )}
            {overBudget && ' — capped'}
          </button>
        </div>
      </div>

      <div className="flex-1 flex gap-8 min-h-0">
        {/* Terminal Output */}
        <div className="flex-1 flex flex-col">
          <h2 className="text-lg font-semibold mb-2">Output</h2>
          <AgentTerminal agentId={agentId} taskId={selectedTask} />
        </div>

        {/* Right panels */}
        <div className="flex flex-col gap-6 w-72">
          {/* Task Selector */}
          <div className="flex-1 flex flex-col min-h-0">
            <h2 className="text-lg font-semibold mb-2">Available Tasks</h2>
            <div className="flex-1 overflow-y-auto space-y-2 bg-gray-800 rounded-lg p-4">
              {tasks.length === 0 ? (
                <p className="text-gray-400 text-sm">No tasks</p>
              ) : (
                tasks.map(task => (
                  <button
                    key={task.id}
                    onClick={() => setSelectedTask(task.id)}
                    className={`w-full text-left p-2 rounded text-sm transition-colors truncate ${
                      selectedTask === task.id ? 'bg-blue-600' : 'bg-gray-700 hover:bg-gray-600'
                    }`}
                    title={task.title}
                  >
                    {task.title}
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Children Agents */}
          <div className="flex-1 flex flex-col min-h-0">
            <h2 className="text-lg font-semibold mb-2">Child Agents</h2>
            <div className="flex-1 overflow-y-auto space-y-2 bg-gray-800 rounded-lg p-4">
              {children.length === 0 ? (
                <p className="text-gray-400 text-sm">No child agents</p>
              ) : (
                children.map(child => (
                  <Link key={child.id} href={`/agents/${child.id}`}>
                    <div className="p-2 bg-gray-700 hover:bg-gray-600 rounded cursor-pointer transition-colors">
                      <p className="text-sm font-semibold text-white truncate">{child.name}</p>
                      <p className={`text-xs mt-1 ${
                        child.status === 'idle' ? 'text-green-400' :
                        child.status === 'running' ? 'text-blue-400' :
                        child.status === 'paused' ? 'text-yellow-400' :
                        'text-red-400'
                      }`}>
                        {child.status}
                      </p>
                    </div>
                  </Link>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
