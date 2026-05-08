'use client'

import { useEffect, useState } from 'react'
import { API_BASE } from '@/lib/api'
import { Agent, Memory } from '@/types'

type MemoryType = 'all' | 'short_term' | 'long_term'

export default function MemoryPage() {
  const [agents, setAgents] = useState<Agent[]>([])
  const [selectedAgent, setSelectedAgent] = useState<number | null>(null)
  const [memories, setMemories] = useState<Memory[]>([])
  const [filterType, setFilterType] = useState<MemoryType>('all')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchAgents = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/agents`)
        const data = await res.json()
        setAgents(data)
        if (data.length > 0) {
          setSelectedAgent(data[0].id)
        }
      } catch (error) {
        console.error('Failed to fetch agents:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchAgents()
  }, [])

  useEffect(() => {
    if (!selectedAgent) return

    const fetchMemory = async () => {
      try {
        const url = filterType === 'all'
          ? `${API_BASE}/api/memory/${selectedAgent}`
          : `${API_BASE}/api/memory/${selectedAgent}?type=${filterType}`

        const res = await fetch(url)
        const data = await res.json()
        setMemories(data)
      } catch (error) {
        console.error('Failed to fetch memory:', error)
      }
    }

    fetchMemory()
  }, [selectedAgent, filterType])

  const roleColors: Record<string, string> = {
    user: 'bg-blue-900 text-blue-200',
    assistant: 'bg-green-900 text-green-200',
    tool: 'bg-yellow-900 text-yellow-200',
  }

  return (
    <div className="p-8 h-screen flex flex-col">
      <h1 className="text-3xl font-bold mb-8">Memory</h1>

      <div className="flex gap-4 mb-6">
        <div className="flex-1">
          <label className="block text-sm font-medium mb-2">Agent</label>
          <select
            value={selectedAgent || ''}
            onChange={(e) => setSelectedAgent(parseInt(e.target.value))}
            className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg"
          >
            {agents.map(agent => (
              <option key={agent.id} value={agent.id}>
                {agent.name} ({agent.model})
              </option>
            ))}
          </select>
        </div>

        <div className="flex-1">
          <label className="block text-sm font-medium mb-2">Filter</label>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as MemoryType)}
            className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg"
          >
            <option value="all">All Memory</option>
            <option value="short_term">Short-term</option>
            <option value="long_term">Long-term</option>
          </select>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto space-y-3">
        {memories.length === 0 ? (
          <div className="text-gray-400 text-center py-12">
            {loading ? 'Loading...' : 'No memories found'}
          </div>
        ) : (
          memories.map(memory => (
            <div key={memory.id} className="bg-gray-800 rounded-lg p-4 border-l-4 border-gray-700">
              <div className="flex items-center justify-between mb-2">
                <span className={`px-2 py-1 rounded text-xs font-medium ${roleColors[memory.role] || 'bg-gray-700'}`}>
                  {memory.role}
                </span>
                <span className="text-xs text-gray-500">
                  {new Date(memory.created_at).toLocaleString()}
                </span>
              </div>
              <p className="text-sm text-gray-100 whitespace-pre-wrap">{memory.content}</p>
              <span className="inline-block mt-2 px-2 py-1 bg-gray-700 rounded text-xs text-gray-400">
                {memory.type}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
