'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { API_BASE } from '@/lib/api'
import { Task, Agent } from '@/types'

interface TaskWithAgent extends Task {
  agent?: Agent
}

export default function TaskDetailPage() {
  const params = useParams()
  const taskId = parseInt(params.id as string)
  const [task, setTask] = useState<TaskWithAgent | null>(null)
  const [subtasks, setSubtasks] = useState<Task[]>([])
  const [agents, setAgents] = useState<Map<number, Agent>>(new Map())
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchTask()
    const interval = setInterval(fetchTask, 3000)
    return () => clearInterval(interval)
  }, [taskId])

  const fetchTask = async () => {
    try {
      const [taskRes, subtasksRes, agentsRes] = await Promise.all([
        fetch(`${API_BASE}/api/tasks/${taskId}`),
        fetch(`${API_BASE}/api/tasks/${taskId}/subtasks`),
        fetch(`${API_BASE}/api/agents`)
      ])

      const taskData = await taskRes.json()
      const subtasksData = await subtasksRes.json()
      const agentsData = await agentsRes.json()

      setTask(taskData)
      setSubtasks(subtasksData)

      const agentMap = new Map()
      agentsData.forEach((agent: Agent) => {
        agentMap.set(agent.id, agent)
      })
      setAgents(agentMap)
    } catch (error) {
      console.error('Failed to fetch task:', error)
    } finally {
      setLoading(false)
    }
  }

  const statusColor = {
    pending: 'bg-gray-700 text-gray-200',
    running: 'bg-blue-900 text-blue-200',
    done: 'bg-green-900 text-green-200',
    failed: 'bg-red-900 text-red-200',
  }

  const SubtaskTree = ({ task, level = 0 }: { task: Task; level?: number }) => {
    const children = subtasks.filter(st => st.parent_task_id === task.id)
    const agent = task.agent_id ? agents.get(task.agent_id) : null

    return (
      <div className={`pl-${level * 4}`}>
        <div className="bg-gray-800 rounded-lg p-4 mb-2 border-l-4 border-gray-700">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <h3 className="font-semibold text-white">{task.title}</h3>
              <p className="text-sm text-gray-400 mt-1">{task.description}</p>
              {agent && (
                <Link href={`/agents/${agent.id}`}>
                  <p className="text-xs text-blue-400 mt-2 hover:underline">
                    Agent: {agent.name}
                  </p>
                </Link>
              )}
            </div>
            <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusColor[task.status as keyof typeof statusColor] || 'bg-gray-700'}`}>
              {task.status}
            </span>
          </div>
        </div>

        {children.length > 0 && (
          <div className={`ml-4 border-l border-gray-700`}>
            {children.map(child => (
              <SubtaskTree key={child.id} task={child} level={level + 1} />
            ))}
          </div>
        )}
      </div>
    )
  }

  if (loading || !task) {
    return <div className="p-8 text-gray-400">Loading...</div>
  }

  const agent = task.agent_id ? agents.get(task.agent_id) : null

  return (
    <div className="p-8 h-screen flex flex-col">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-4">{task.title}</h1>
        <p className="text-gray-400 mb-4">{task.description}</p>
        <div className="flex items-center gap-4">
          <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusColor[task.status as keyof typeof statusColor] || 'bg-gray-700'}`}>
            {task.status}
          </span>
          {agent && (
            <Link href={`/agents/${agent.id}`}>
              <span className="text-sm text-blue-400 hover:underline">
                Assigned to: {agent.name}
              </span>
            </Link>
          )}
          {task.result && (
            <div className="text-sm text-green-400 bg-green-900/20 px-3 py-1 rounded">
              ✓ Completed
            </div>
          )}
        </div>
      </div>

      {task.result && (
        <div className="mb-8 bg-gray-800 rounded-lg p-4">
          <h2 className="text-lg font-semibold mb-2">Result</h2>
          <p className="text-gray-300 whitespace-pre-wrap">{task.result}</p>
        </div>
      )}

      <div className="flex-1 overflow-y-auto">
        <h2 className="text-lg font-semibold mb-4">
          Subtasks {subtasks.length > 0 && `(${subtasks.length})`}
        </h2>
        {subtasks.length === 0 ? (
          <p className="text-gray-400">No subtasks</p>
        ) : (
          <SubtaskTree task={task} />
        )}
      </div>
    </div>
  )
}
