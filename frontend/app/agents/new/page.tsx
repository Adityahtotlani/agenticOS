'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

export default function NewAgentPage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [model, setModel] = useState('claude-sonnet-4-6')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const res = await fetch('http://localhost:8000/api/agents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, model }),
      })

      if (!res.ok) {
        throw new Error('Failed to create agent')
      }

      router.push('/agents')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create agent')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-8 max-w-2xl">
      <h1 className="text-3xl font-bold mb-8">Create New Agent</h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-medium mb-2">Agent Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:border-blue-500"
            placeholder="e.g., Research Agent, Code Analyzer"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Model</label>
          <select
            value={model}
            onChange={(e) => setModel(e.target.value)}
            className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:border-blue-500"
          >
            <option value="claude-opus-4-7">Claude Opus 4.7 (Most powerful)</option>
            <option value="claude-sonnet-4-6">Claude Sonnet 4.6 (Balanced)</option>
            <option value="claude-haiku-4-5">Claude Haiku 4.5 (Fast)</option>
          </select>
        </div>

        {error && (
          <div className="bg-red-900 text-red-200 p-3 rounded">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading || !name}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 px-4 py-2 rounded-lg font-medium transition-colors"
        >
          {loading ? 'Creating...' : 'Create Agent'}
        </button>
      </form>
    </div>
  )
}
