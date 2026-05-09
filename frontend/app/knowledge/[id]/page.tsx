'use client'

import { useEffect, useState, useRef } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { API_BASE } from '@/lib/api'
import { KnowledgeBase, KBDocument } from '@/types'
import { Upload, Trash2, FileText, ArrowLeft } from 'lucide-react'

export default function KnowledgeBaseDetailPage() {
  const params = useParams()
  const kbId = parseInt(params.id as string)
  const [kb, setKb] = useState<KnowledgeBase | null>(null)
  const [documents, setDocuments] = useState<KBDocument[]>([])
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const fileInput = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetchData()
  }, [kbId])

  const fetchData = async () => {
    try {
      const [kbRes, docsRes] = await Promise.all([
        fetch(`${API_BASE}/api/knowledge-bases/${kbId}`),
        fetch(`${API_BASE}/api/knowledge-bases/${kbId}/documents`),
      ])
      setKb(await kbRes.json())
      setDocuments(await docsRes.json())
    } catch (e) {
      console.error(e)
    }
  }

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    setError('')
    const formData = new FormData()
    formData.append('file', file)
    try {
      const res = await fetch(`${API_BASE}/api/knowledge-bases/${kbId}/documents`, {
        method: 'POST',
        body: formData,
      })
      if (!res.ok) {
        const detail = await res.json().catch(() => ({}))
        throw new Error(detail.detail || 'Upload failed')
      }
      fetchData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setUploading(false)
      if (fileInput.current) fileInput.current.value = ''
    }
  }

  const handleDelete = async (docId: number) => {
    if (!confirm('Delete this document?')) return
    try {
      await fetch(`${API_BASE}/api/knowledge-bases/${kbId}/documents/${docId}`, { method: 'DELETE' })
      fetchData()
    } catch (e) {
      console.error(e)
    }
  }

  if (!kb) return <div className="p-8 text-gray-400">Loading...</div>

  return (
    <div className="p-8 max-w-4xl">
      <Link href="/knowledge" className="inline-flex items-center gap-2 text-blue-400 hover:underline text-sm mb-4">
        <ArrowLeft size={16} />
        Back to Knowledge Bases
      </Link>

      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">{kb.name}</h1>
        {kb.description && <p className="text-gray-400">{kb.description}</p>}
      </div>

      <div className="mb-6">
        <input
          ref={fileInput}
          type="file"
          accept=".txt,.md,.json,.csv,.html,.xml,.py,.js,.ts,.tsx,.jsx,.yaml,.yml"
          onChange={handleUpload}
          disabled={uploading}
          className="hidden"
          id="file-upload"
        />
        <label
          htmlFor="file-upload"
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg cursor-pointer transition-colors ${
            uploading ? 'bg-gray-700 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
          }`}
        >
          <Upload size={20} />
          {uploading ? 'Uploading & embedding...' : 'Upload Document'}
        </label>
        <p className="text-xs text-gray-500 mt-2">UTF-8 text files only (txt, md, json, csv, etc.)</p>
        {error && <p className="text-red-400 text-sm mt-2">{error}</p>}
      </div>

      <div>
        <h2 className="text-xl font-semibold mb-4">Documents ({documents.length})</h2>
        {documents.length === 0 ? (
          <p className="text-gray-400">No documents uploaded yet.</p>
        ) : (
          <div className="space-y-2">
            {documents.map(doc => (
              <div
                key={doc.id}
                className="flex items-center justify-between bg-gray-800 rounded-lg p-4 border border-gray-700"
              >
                <div className="flex items-center gap-3">
                  <FileText size={20} className="text-gray-400" />
                  <div>
                    <p className="font-medium">{doc.filename}</p>
                    <p className="text-xs text-gray-500">{doc.chunks_count} chunk{doc.chunks_count !== 1 ? 's' : ''}</p>
                  </div>
                </div>
                <button
                  onClick={() => handleDelete(doc.id)}
                  className="text-gray-500 hover:text-red-400"
                  title="Delete"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
