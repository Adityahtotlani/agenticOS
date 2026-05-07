'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

export default function NewTaskPage() {
  const router = useRouter()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [agentId, setAgentId] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const res = await fetch('http://localhost:8000/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          description,
          agent_id: agentId ? parseInt(agentId) : null,
        }),
      })

      if (!res.ok) {
        throw new Error('Failed to create task')
      }

      router.push('/tasks')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create task')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-8 max-w-2xl">
      <h1 className="text-3xl font-bold mb-8">Create New Task</h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-medium mb-2">Title</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:border-blue-500"
            placeholder="Task title"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
            rows={6}
            className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:border-blue-500"
            placeholder="Describe what the agent should do..."
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Assign Agent (Optional)</label>
          <input
            type="number"
            value={agentId}
            onChange={(e) => setAgentId(e.target.value)}
            className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:border-blue-500"
            placeholder="Leave empty to assign later"
          />
        </div>

        {error && (
          <div className="bg-red-900 text-red-200 p-3 rounded">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 px-4 py-2 rounded-lg font-medium transition-colors"
        >
          {loading ? 'Creating...' : 'Create Task'}
        </button>
      </form>
    </div>
  )
}
