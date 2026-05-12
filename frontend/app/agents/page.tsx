'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { apiFetch } from '@/lib/api'
import AgentCard from '@/components/AgentCard'
import { Plus, Upload } from 'lucide-react'

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
  const importInputRef = useRef<HTMLInputElement>(null)

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const text = await file.text()
    const bundle = JSON.parse(text)
    const res = await apiFetch('/api/agents/import', {
      method: 'POST',
      body: JSON.stringify(bundle),
    })
    if (res.ok) {
      fetchAgents()
    }
    e.target.value = ''
  }

  useEffect(() => {
    fetchAgents()
  }, [])

  const fetchAgents = async () => {
    try {
      const res = await apiFetch('/api/agents')
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
        <div className="flex items-center gap-2">
          <input
            ref={importInputRef}
            type="file"
            accept=".json"
            className="hidden"
            onChange={handleImport}
          />
          <button
            onClick={() => importInputRef.current?.click()}
            className="flex items-center gap-2 bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded-lg transition-colors"
          >
            <Upload size={20} />
            Import Agent
          </button>
          <Link
            href="/agents/new"
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg transition-colors"
          >
            <Plus size={20} />
            New Agent
          </Link>
        </div>
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
