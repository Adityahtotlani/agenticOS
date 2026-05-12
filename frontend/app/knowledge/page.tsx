'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { apiFetch } from '@/lib/api'
import { KnowledgeBase } from '@/types'
import { Plus, BookOpen, Trash2 } from 'lucide-react'

export default function KnowledgePage() {
  const [kbs, setKbs] = useState<KnowledgeBase[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')

  useEffect(() => {
    fetchKbs()
  }, [])

  const fetchKbs = async () => {
    try {
      const res = await apiFetch('/api/knowledge-bases')
      setKbs(await res.json())
    } catch (e) {
      console.error('Failed to fetch knowledge bases:', e)
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const res = await apiFetch('/api/knowledge-bases', {
        method: 'POST',
        body: JSON.stringify({ name, description }),
      })
      if (!res.ok) throw new Error('Failed to create')
      setName('')
      setDescription('')
      setCreating(false)
      fetchKbs()
    } catch (e) {
      console.error(e)
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this knowledge base and all its documents?')) return
    try {
      await apiFetch(`/api/knowledge-bases/${id}`, { method: 'DELETE' })
      fetchKbs()
    } catch (e) {
      console.error(e)
    }
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold">Knowledge Bases</h1>
        <button
          onClick={() => setCreating(!creating)}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg transition-colors"
        >
          <Plus size={20} />
          New Knowledge Base
        </button>
      </div>

      {creating && (
        <form onSubmit={handleCreate} className="mb-8 bg-gray-800 rounded-lg p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoFocus
              className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg focus:outline-none focus:border-blue-500"
              placeholder="e.g., Product Docs"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Description (optional)</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg focus:outline-none focus:border-blue-500"
              placeholder="What's in this KB?"
            />
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg transition-colors"
            >
              Create
            </button>
            <button
              type="button"
              onClick={() => setCreating(false)}
              className="bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded-lg transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <p className="text-gray-400">Loading...</p>
      ) : kbs.length === 0 ? (
        <div className="text-center py-12">
          <BookOpen size={48} className="mx-auto text-gray-600 mb-4" />
          <p className="text-gray-400">No knowledge bases yet. Create one to upload documents and ground your agents.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {kbs.map(kb => (
            <div key={kb.id} className="bg-gray-800 rounded-lg p-6 border border-gray-700 hover:border-blue-500 transition-all">
              <div className="flex items-start justify-between mb-3">
                <Link href={`/knowledge/${kb.id}`} className="flex-1">
                  <h3 className="text-lg font-semibold text-white hover:text-blue-400">{kb.name}</h3>
                </Link>
                <button
                  onClick={() => handleDelete(kb.id)}
                  className="text-gray-500 hover:text-red-400"
                  title="Delete"
                >
                  <Trash2 size={16} />
                </button>
              </div>
              {kb.description && <p className="text-sm text-gray-400 mb-3">{kb.description}</p>}
              <p className="text-xs text-gray-500">{kb.document_count} document{kb.document_count !== 1 ? 's' : ''}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
