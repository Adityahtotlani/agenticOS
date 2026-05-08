'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { API_BASE } from '@/lib/api'
import AgentCard from '@/components/AgentCard'
import { Plus } from 'lucide-react'

interface Agent {
  id: number
  name: string
  model: string
  status: string
  parent_id: number | null
}

export default function AgentsPage() {
  const [agents, setAgents] = useState<Agent[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchAgents()
  }, [])

  const fetchAgents = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/agents`)
      setAgents(await res.json())
    } catch (error) {
      console.error('Failed to fetch agents:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold">Agents</h1>
        <Link
          href="/agents/new"
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg transition-colors"
        >
          <Plus size={20} />
          New Agent
        </Link>
      </div>

      {loading ? (
        <p className="text-gray-400">Loading...</p>
      ) : agents.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-400 mb-4">No agents yet</p>
          <Link href="/agents/new" className="text-blue-400 hover:underline">
            Create your first agent
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {agents.map(agent => (
            <AgentCard key={agent.id} agent={agent} />
          ))}
        </div>
      )}
    </div>
  )
}
