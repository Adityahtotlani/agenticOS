'use client'

import { useEffect, useState } from 'react'
import { API_BASE } from '@/lib/api'
import AgentCard from '@/components/AgentCard'
import TaskCard from '@/components/TaskCard'

interface Agent {
  id: number
  name: string
  model: string
  status: string
  parent_id: number | null
}

interface Task {
  id: number
  title: string
  description: string
  status: string
  agent_id: number | null
}

export default function Dashboard() {
  const [agents, setAgents] = useState<Agent[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [agentsRes, tasksRes] = await Promise.all([
          fetch(`${API_BASE}/api/agents`),
          fetch(`${API_BASE}/api/tasks`),
        ])

        setAgents(await agentsRes.json())
        setTasks(await tasksRes.json())
      } catch (error) {
        console.error('Failed to fetch data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
    const interval = setInterval(fetchData, 5000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-8">Dashboard</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Agents Section */}
        <div>
          <h2 className="text-2xl font-semibold mb-4">Agents ({agents.length})</h2>
          <div className="space-y-4">
            {agents.length === 0 ? (
              <p className="text-gray-400">No agents yet. <a href="/agents" className="text-blue-400 hover:underline">Create one</a></p>
            ) : (
              agents.map(agent => (
                <AgentCard key={agent.id} agent={agent} />
              ))
            )}
          </div>
        </div>

        {/* Tasks Section */}
        <div>
          <h2 className="text-2xl font-semibold mb-4">Tasks ({tasks.length})</h2>
          <div className="space-y-4">
            {tasks.length === 0 ? (
              <p className="text-gray-400">No tasks yet. <a href="/tasks/new" className="text-blue-400 hover:underline">Create one</a></p>
            ) : (
              tasks.map(task => (
                <TaskCard key={task.id} task={task} />
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
