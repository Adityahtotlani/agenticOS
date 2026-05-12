'use client'

import { useEffect, useState } from 'react'
import { apiFetch } from '@/lib/api'
import { MCPServer, MCPTestResult } from '@/types'
import { Plus, Plug, Trash2, Play, CheckCircle, XCircle } from 'lucide-react'

export default function MCPPage() {
  const [servers, setServers] = useState<MCPServer[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [command, setCommand] = useState('')
  const [argsText, setArgsText] = useState('')
  const [envText, setEnvText] = useState('')
  const [testing, setTesting] = useState<number | null>(null)
  const [testResults, setTestResults] = useState<Record<number, MCPTestResult>>({})

  useEffect(() => {
    fetchServers()
  }, [])

  const fetchServers = async () => {
    try {
      const res = await apiFetch('/api/mcp-servers')
      setServers(await res.json())
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    const args = argsText
      .split('\n')
      .map(s => s.trim())
      .filter(Boolean)
    const env: Record<string, string> = {}
    envText
      .split('\n')
      .map(s => s.trim())
      .filter(Boolean)
      .forEach(line => {
        const idx = line.indexOf('=')
        if (idx > 0) env[line.slice(0, idx).trim()] = line.slice(idx + 1).trim()
      })

    try {
      const res = await apiFetch('/api/mcp-servers', {
        method: 'POST',
        body: JSON.stringify({ name, description, command, args, env, enabled: true }),
      })
      if (!res.ok) throw new Error('Failed to create')
      setName('')
      setDescription('')
      setCommand('')
      setArgsText('')
      setEnvText('')
      setCreating(false)
      fetchServers()
    } catch (e) {
      console.error(e)
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this MCP server config? Agents using it will lose access.')) return
    try {
      await apiFetch(`/api/mcp-servers/${id}`, { method: 'DELETE' })
      fetchServers()
    } catch (e) {
      console.error(e)
    }
  }

  const handleTest = async (id: number) => {
    setTesting(id)
    try {
      const res = await apiFetch(`/api/mcp-servers/${id}/test`, { method: 'POST' })
      const data: MCPTestResult = await res.json()
      setTestResults(prev => ({ ...prev, [id]: data }))
    } catch (e) {
      setTestResults(prev => ({ ...prev, [id]: { ok: false, error: String(e) } }))
    } finally {
      setTesting(null)
    }
  }

  return (
    <div className="p-8 max-w-5xl">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold">MCP Servers</h1>
        <button
          onClick={() => setCreating(!creating)}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg transition-colors"
        >
          <Plus size={20} />
          New Server
        </button>
      </div>

      <p className="text-sm text-gray-400 mb-6">
        MCP (Model Context Protocol) servers expose tools to your agents. Configure a server below, test it,
        then attach it to an agent. Common examples:{' '}
        <code className="text-gray-300">npx -y @modelcontextprotocol/server-filesystem /workspace</code>,{' '}
        <code className="text-gray-300">uvx mcp-server-fetch</code>.
      </p>

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
              placeholder="e.g., Filesystem"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Description (optional)</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg focus:outline-none focus:border-blue-500"
              placeholder="What this server provides"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Command</label>
            <input
              type="text"
              value={command}
              onChange={(e) => setCommand(e.target.value)}
              required
              className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg focus:outline-none focus:border-blue-500 font-mono text-sm"
              placeholder="e.g., npx"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Args (one per line)</label>
            <textarea
              value={argsText}
              onChange={(e) => setArgsText(e.target.value)}
              rows={4}
              className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg focus:outline-none focus:border-blue-500 font-mono text-sm"
              placeholder={"-y\n@modelcontextprotocol/server-filesystem\n/workspace"}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Environment (KEY=value, one per line)</label>
            <textarea
              value={envText}
              onChange={(e) => setEnvText(e.target.value)}
              rows={3}
              className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg focus:outline-none focus:border-blue-500 font-mono text-sm"
              placeholder={"GITHUB_TOKEN=ghp_..."}
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
      ) : servers.length === 0 ? (
        <div className="text-center py-12">
          <Plug size={48} className="mx-auto text-gray-600 mb-4" />
          <p className="text-gray-400">
            No MCP servers yet. Add one to extend your agents with external tools.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {servers.map(server => {
            const result = testResults[server.id]
            return (
              <div key={server.id} className="bg-gray-800 rounded-lg p-5 border border-gray-700">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1">
                      <h3 className="text-lg font-semibold text-white">{server.name}</h3>
                      {!server.enabled && (
                        <span className="text-xs bg-gray-700 text-gray-300 px-2 py-0.5 rounded">disabled</span>
                      )}
                    </div>
                    {server.description && (
                      <p className="text-sm text-gray-400 mb-2">{server.description}</p>
                    )}
                    <code className="block text-xs text-gray-500 font-mono mt-2">
                      {server.command} {server.args.join(' ')}
                    </code>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleTest(server.id)}
                      disabled={testing === server.id}
                      className="flex items-center gap-1 px-3 py-1.5 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 rounded text-sm"
                    >
                      <Play size={14} />
                      {testing === server.id ? 'Testing...' : 'Test'}
                    </button>
                    <button
                      onClick={() => handleDelete(server.id)}
                      className="text-gray-500 hover:text-red-400 p-1.5"
                      title="Delete"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
                {result && (
                  <div
                    className={`mt-3 p-3 rounded text-sm ${
                      result.ok
                        ? 'bg-green-900/20 border border-green-700/40'
                        : 'bg-red-900/20 border border-red-700/40'
                    }`}
                  >
                    {result.ok ? (
                      <>
                        <div className="flex items-center gap-2 text-green-400 mb-2">
                          <CheckCircle size={14} />
                          <span className="font-medium">
                            Connected — {result.tools?.length ?? 0} tool
                            {result.tools?.length === 1 ? '' : 's'}
                          </span>
                        </div>
                        {result.tools && result.tools.length > 0 && (
                          <ul className="ml-6 space-y-0.5 text-xs text-gray-300">
                            {result.tools.map(t => (
                              <li key={t.name}>
                                <code className="text-blue-300">{t.name}</code>
                                {t.description && (
                                  <span className="text-gray-500"> — {t.description.slice(0, 80)}</span>
                                )}
                              </li>
                            ))}
                          </ul>
                        )}
                      </>
                    ) : (
                      <div className="flex items-center gap-2 text-red-400">
                        <XCircle size={14} />
                        <span className="font-mono text-xs">{result.error}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
