'use client'

import Link from 'next/link'
import { Task } from '@/types'

export default function TaskCard({ task }: { task: Task }) {
  const statusColor = {
    pending: 'bg-gray-700 text-gray-200',
    running: 'bg-blue-900 text-blue-200',
    done: 'bg-green-900 text-green-200',
    failed: 'bg-red-900 text-red-200',
  }[task.status] || 'bg-gray-700 text-gray-200'

  return (
    <Link href={`/tasks/${task.id}`}>
      <div className="bg-gray-800 rounded-lg p-4 hover:bg-gray-700 transition-colors cursor-pointer">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <h3 className="font-semibold text-white">{task.title}</h3>
            <p className="text-sm text-gray-400 mt-1">{task.description}</p>
            {task.agent_id && (
              <p className="text-xs text-gray-500 mt-2">Agent: {task.agent_id}</p>
            )}
          </div>
          <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusColor}`}>
            {task.status}
          </span>
        </div>
      </div>
    </Link>
  )
}
