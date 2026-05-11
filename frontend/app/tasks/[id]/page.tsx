'use client'

import { useEffect, useState, useRef } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { API_BASE } from '@/lib/api'
import { Task, Agent, Attachment } from '@/types'

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
  const [attachments, setAttachments] = useState<Attachment[]>([])
  const [attachmentData, setAttachmentData] = useState<Record<number, string>>({})
  const addFileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetchTask()
    fetchAttachments()
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

  const fetchAttachments = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/tasks/${taskId}/attachments`)
      const list: Attachment[] = await res.json()
      setAttachments(list)
      for (const att of list) {
        const r = await fetch(`${API_BASE}/api/attachments/${att.id}/data`)
        const { data, mime_type } = await r.json()
        setAttachmentData(prev => ({ ...prev, [att.id]: `data:${mime_type};base64,${data}` }))
      }
    } catch (error) {
      console.error('Failed to fetch attachments:', error)
    }
  }

  const handleAddAttachment = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    e.target.value = ''
    for (const file of files) {
      const fd = new FormData()
      fd.append('file', file)
      await fetch(`${API_BASE}/api/tasks/${taskId}/attachments`, {
        method: 'POST',
        body: fd,
      })
    }
    await fetchAttachments()
  }

  const handleDeleteAttachment = async (attachmentId: number) => {
    await fetch(`${API_BASE}/api/attachments/${attachmentId}`, { method: 'DELETE' })
    setAttachments(prev => prev.filter(a => a.id !== attachmentId))
    setAttachmentData(prev => {
      const next = { ...prev }
      delete next[attachmentId]
      return next
    })
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
              Completed
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

      <div className="mb-8 bg-gray-800 rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">Attachments {attachments.length > 0 && `(${attachments.length})`}</h2>
          <button
            onClick={() => addFileInputRef.current?.click()}
            className="text-sm bg-gray-700 hover:bg-gray-600 px-3 py-1 rounded transition-colors text-gray-300"
          >
            Add image
          </button>
          <input
            ref={addFileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={handleAddAttachment}
          />
        </div>
        {attachments.length === 0 ? (
          <p className="text-gray-500 text-sm">No attachments</p>
        ) : (
          <div className="flex flex-wrap gap-3">
            {attachments.map(att => (
              <div key={att.id} className="relative group">
                {attachmentData[att.id] ? (
                  <img
                    src={attachmentData[att.id]}
                    alt={att.filename}
                    className="max-h-48 rounded border border-gray-700 object-contain"
                  />
                ) : (
                  <div className="w-32 h-32 bg-gray-900 rounded border border-gray-700 flex items-center justify-center text-gray-500 text-xs">
                    Loading...
                  </div>
                )}
                <div className="mt-1 flex items-center justify-between gap-2">
                  <span className="text-xs text-gray-400 truncate max-w-[120px]">{att.filename}</span>
                  <button
                    onClick={() => handleDeleteAttachment(att.id)}
                    className="text-xs text-red-400 hover:text-red-300 shrink-0"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

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
