'use client'

import Link from 'next/link'
import { Play, Pause, X } from 'lucide-react'

interface Agent {
  id: number
  name: string
  model: string
  status: string
  parent_id: number | null
}

export default function AgentCard({ agent }: { agent: Agent }) {
  const statusColor = {
    idle: 'bg-green-900 text-green-200',
    running: 'bg-blue-900 text-blue-200',
    paused: 'bg-yellow-900 text-yellow-200',
    dead: 'bg-red-900 text-red-200',
  }[agent.status] || 'bg-gray-700 text-gray-200'

  return (
    <Link href={`/agents/${agent.id}`}>
      <div className="bg-gray-800 rounded-lg p-4 hover:bg-gray-700 transition-colors cursor-pointer">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <h3 className="font-semibold text-white">{agent.name}</h3>
            <p className="text-sm text-gray-400">{agent.model}</p>
          </div>
          <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusColor}`}>
            {agent.status}
          </span>
        </div>
      </div>
    </Link>
  )
}
