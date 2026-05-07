'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import TaskCard from '@/components/TaskCard'
import { Plus } from 'lucide-react'

interface Task {
  id: number
  title: string
  description: string
  status: string
  agent_id: number | null
}

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchTasks()
  }, [])

  const fetchTasks = async () => {
    try {
      const res = await fetch('http://localhost:8000/api/tasks')
      setTasks(await res.json())
    } catch (error) {
      console.error('Failed to fetch tasks:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold">Tasks</h1>
        <Link
          href="/tasks/new"
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg transition-colors"
        >
          <Plus size={20} />
          New Task
        </Link>
      </div>

      {loading ? (
        <p className="text-gray-400">Loading...</p>
      ) : tasks.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-400 mb-4">No tasks yet</p>
          <Link href="/tasks/new" className="text-blue-400 hover:underline">
            Create your first task
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {tasks.map(task => (
            <TaskCard key={task.id} task={task} />
          ))}
        </div>
      )}
    </div>
  )
}
