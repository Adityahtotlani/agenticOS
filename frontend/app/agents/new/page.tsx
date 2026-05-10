'use client'

import { useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import { API_BASE } from '@/lib/api'
import { AgentTemplate, KnowledgeBase, MCPServer } from '@/types'

export default function NewAgentPage() {
  const router = useRouter()
  const [step, setStep] = useState<'template' | 'customize'>('template')
  const [templates, setTemplates] = useState<AgentTemplate[]>([])
  const [knowledgeBases, setKnowledgeBases] = useState<KnowledgeBase[]>([])
  const [mcpServers, setMcpServers] = useState<MCPServer[]>([])
  const [selectedTemplate, setSelectedTemplate] = useState<AgentTemplate | null>(null)
  const [name, setName] = useState('')
  const [model, setModel] = useState('claude-sonnet-4-6')
  const [systemPrompt, setSystemPrompt] = useState('')
  const [knowledgeBaseId, setKnowledgeBaseId] = useState<string>('')
  const [selectedMcpIds, setSelectedMcpIds] = useState<number[]>([])
  const [budgetUsd, setBudgetUsd] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const [templatesRes, kbsRes, mcpRes] = await Promise.all([
          fetch(`${API_BASE}/api/templates`),
          fetch(`${API_BASE}/api/knowledge-bases`),
          fetch(`${API_BASE}/api/mcp-servers`),
        ])
        setTemplates(await templatesRes.json())
        setKnowledgeBases(await kbsRes.json())
        setMcpServers(await mcpRes.json())
      } catch (err) {
        console.error('Failed to fetch initial data:', err)
      }
    }
    fetchInitialData()
  }, [])

  const toggleMcp = (id: number) => {
    setSelectedMcpIds(prev => (prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]))
  }

  const handleSelectTemplate = (template: AgentTemplate | null) => {
    if (template) {
      setSelectedTemplate(template)
      setName(template.name)
      setModel(template.model)
      setSystemPrompt(template.system_prompt)
    } else {
      setSelectedTemplate(null)
      setName('')
      setModel('claude-sonnet-4-6')
      setSystemPrompt('')
    }
    setStep('customize')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const res = await fetch(`${API_BASE}/api/agents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          model,
          system_prompt: systemPrompt || undefined,
          knowledge_base_id: knowledgeBaseId ? parseInt(knowledgeBaseId) : undefined,
          mcp_server_ids: selectedMcpIds,
          budget_usd: budgetUsd ? parseFloat(budgetUsd) : undefined,
        }),
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

  if (step === 'template') {
    return (
      <div className="p-8 max-w-5xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Create New Agent</h1>
        <p className="text-gray-400 mb-8">Choose an agent template to get started, or create a custom agent</p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          {templates.map(template => (
            <button
              key={template.id}
              onClick={() => handleSelectTemplate(template)}
              className="text-left p-6 bg-gray-800 hover:bg-gray-700 rounded-lg border border-gray-700 hover:border-blue-500 transition-all cursor-pointer"
            >
              <h3 className="text-lg font-semibold text-white mb-2">{template.name}</h3>
              <p className="text-sm text-gray-400 mb-3">{template.description}</p>
              <p className="text-xs text-gray-500">Model: {template.model}</p>
            </button>
          ))}

          {/* Custom Agent Card */}
          <button
            onClick={() => handleSelectTemplate(null)}
            className="text-left p-6 bg-gray-800 hover:bg-gray-700 rounded-lg border-2 border-dashed border-gray-600 hover:border-blue-500 transition-all cursor-pointer flex items-center justify-center"
          >
            <div className="text-center">
              <div className="text-3xl mb-2">+</div>
              <h3 className="text-lg font-semibold text-white">Custom Agent</h3>
              <p className="text-sm text-gray-400 mt-1">Create from scratch</p>
            </div>
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <div className="mb-6">
        <button
          onClick={() => setStep('template')}
          className="text-blue-400 hover:underline text-sm"
        >
          ← Back to Templates
        </button>
      </div>

      <h1 className="text-3xl font-bold mb-2">
        {selectedTemplate ? `Customize ${selectedTemplate.name}` : 'Create Custom Agent'}
      </h1>
      <p className="text-gray-400 mb-8">Configure your agent settings</p>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-medium mb-2">Agent Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:border-blue-500"
            placeholder="e.g., My Research Agent"
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

        <div>
          <label className="block text-sm font-medium mb-2">System Prompt</label>
          <textarea
            value={systemPrompt}
            onChange={(e) => setSystemPrompt(e.target.value)}
            rows={6}
            className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:border-blue-500"
            placeholder="Define the agent's personality and behavior..."
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">
            Knowledge Base <span className="text-gray-500 font-normal">(optional)</span>
          </label>
          <select
            value={knowledgeBaseId}
            onChange={(e) => setKnowledgeBaseId(e.target.value)}
            className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:border-blue-500"
          >
            <option value="">None (no knowledge base)</option>
            {knowledgeBases.map(kb => (
              <option key={kb.id} value={kb.id}>
                {kb.name} ({kb.document_count} doc{kb.document_count !== 1 ? 's' : ''})
              </option>
            ))}
          </select>
          <p className="text-xs text-gray-500 mt-1">
            Attach a knowledge base to give the agent the <code>search_kb</code> tool.
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">
            MCP Servers <span className="text-gray-500 font-normal">(optional)</span>
          </label>
          {mcpServers.length === 0 ? (
            <p className="text-sm text-gray-500 italic">
              No MCP servers configured. Add some on the{' '}
              <a href="/mcp" className="text-blue-400 hover:underline">MCP Servers</a> page.
            </p>
          ) : (
            <div className="space-y-2 bg-gray-800 rounded-lg p-3 border border-gray-700">
              {mcpServers.map(server => (
                <label
                  key={server.id}
                  className="flex items-start gap-3 cursor-pointer hover:bg-gray-900/50 px-2 py-1.5 rounded"
                >
                  <input
                    type="checkbox"
                    checked={selectedMcpIds.includes(server.id)}
                    onChange={() => toggleMcp(server.id)}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <div className="text-sm font-medium">{server.name}</div>
                    {server.description && (
                      <div className="text-xs text-gray-400">{server.description}</div>
                    )}
                  </div>
                </label>
              ))}
            </div>
          )}
          <p className="text-xs text-gray-500 mt-1">
            Selected servers spawn for the lifetime of each task and expose their tools to the agent.
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">
            Budget cap (USD) <span className="text-gray-500 font-normal">(optional)</span>
          </label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={budgetUsd}
            onChange={(e) => setBudgetUsd(e.target.value)}
            className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:border-blue-500"
            placeholder="e.g., 5.00 — leave empty for unlimited"
          />
          <p className="text-xs text-gray-500 mt-1">
            Agent pauses automatically when its cumulative spend reaches this cap. You can raise it later.
          </p>
        </div>

        {error && (
          <div className="bg-red-900 text-red-200 p-3 rounded">
            {error}
          </div>
        )}

        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => setStep('template')}
            className="flex-1 bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded-lg font-medium transition-colors"
          >
            Back
          </button>
          <button
            type="submit"
            disabled={loading || !name}
            className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 px-4 py-2 rounded-lg font-medium transition-colors"
          >
            {loading ? 'Creating...' : 'Create Agent'}
          </button>
        </div>
      </form>
    </div>
  )
}
