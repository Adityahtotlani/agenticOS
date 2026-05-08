'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import AgentTerminal from '@/components/AgentTerminal'
import { Agent, Task } from '@/types'

export default function AgentDetailPage() {
  const params = useParams()
  const agentId = parseInt(params.id as string)
  const [agent, setAgent] = useState<Agent | null>(null)
  const [tasks, setTasks] = useState<Task[]>([])
  const [selectedTask, setSelectedTask] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchAgent()
    fetchTasks()
  }, [agentId])

  const fetchAgent = async () => {
    try {
      const res = await fetch(`http://localhost:8000/api/agents/${agentId}`)
      setAgent(await res.json())
    } catch (error) {
      console.error('Failed to fetch agent:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchTasks = async () => {
    try {
      const res = await fetch('http://localhost:8000/api/tasks')
      setTasks(await res.json())
    } catch (error) {
      console.error('Failed to fetch tasks:', error)
    }
  }

  if (loading || !agent) {
    return <div className="p-8 text-gray-400">Loading...</div>
  }

  return (
    <div className="p-8 flex flex-col h-screen">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">{agent.name}</h1>
        <div className="flex items-center gap-4 text-sm">
          <span className="text-gray-400">Model: {agent.model}</span>
          <span className={`px-2 py-1 rounded text-xs ${
            agent.status === 'idle' ? 'bg-green-900' :
            agent.status === 'running' ? 'bg-blue-900' :
            'bg-gray-700'
          }`}>
            {agent.status}
          </span>
        </div>
      </div>

      <div className="flex-1 flex gap-8 min-h-0">
        {/* Terminal Output */}
        <div className="flex-1 flex flex-col">
          <h2 className="text-lg font-semibold mb-2">Output</h2>
          <AgentTerminal agentId={agentId} taskId={selectedTask} />
        </div>

        {/* Task Selector */}
        <div className="w-64 flex flex-col">
          <h2 className="text-lg font-semibold mb-2">Available Tasks</h2>
          <div className="flex-1 overflow-y-auto space-y-2 bg-gray-800 rounded-lg p-4">
            {tasks.length === 0 ? (
              <p className="text-gray-400 text-sm">No tasks available</p>
            ) : (
              tasks.map(task => (
                <button
                  key={task.id}
                  onClick={() => setSelectedTask(task.id)}
                  className={`w-full text-left p-2 rounded text-sm transition-colors ${
                    selectedTask === task.id
                      ? 'bg-blue-600'
                      : 'bg-gray-700 hover:bg-gray-600'
                  }`}
                >
                  {task.title}
                </button>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
