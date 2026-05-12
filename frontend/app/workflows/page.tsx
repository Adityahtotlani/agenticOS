'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { apiFetch } from '@/lib/api'
import { Workflow, WorkflowRun, WorkflowStep } from '@/types'
import { Agent } from '@/types'
import { Plus, Play, Pencil, Trash2, X, ChevronDown, ChevronUp } from 'lucide-react'

interface StepFormData {
  agent_id: string
  task_title: string
  task_description: string
}

interface EditorState {
  workflowId: number | null  // null = creating new
  name: string
  description: string
  steps: StepFormData[]
}

const defaultEditor = (): EditorState => ({
  workflowId: null,
  name: '',
  description: '',
  steps: [],
})

function statusBadge(status: string) {
  const map: Record<string, string> = {
    running: 'bg-blue-600 text-white',
    completed: 'bg-green-700 text-white',
    failed: 'bg-red-700 text-white',
  }
  return map[status] ?? 'bg-gray-600 text-white'
}

export default function WorkflowsPage() {
  const router = useRouter()
  const [workflows, setWorkflows] = useState<Workflow[]>([])
  const [agents, setAgents] = useState<Agent[]>([])
  const [recentRuns, setRecentRuns] = useState<Record<number, WorkflowRun[]>>({})
  const [editor, setEditor] = useState<EditorState | null>(null)
  const [expandedRuns, setExpandedRuns] = useState<Record<number, boolean>>({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function fetchWorkflows() {
    const res = await apiFetch('/api/workflows')
    const data = await res.json()
    setWorkflows(data)
  }

  async function fetchAgents() {
    const res = await apiFetch('/api/agents')
    const data = await res.json()
    setAgents(data)
  }

  async function fetchRunsForWorkflow(workflowId: number) {
    const res = await apiFetch(`/api/workflows/${workflowId}/runs`)
    const data = await res.json()
    setRecentRuns(prev => ({ ...prev, [workflowId]: data.slice(0, 3) }))
  }

  useEffect(() => {
    fetchWorkflows()
    fetchAgents()
  }, [])

  useEffect(() => {
    workflows.forEach(w => fetchRunsForWorkflow(w.id))
  }, [workflows.length])

  function openCreate() {
    setEditor(defaultEditor())
    setError('')
  }

  function openEdit(w: Workflow) {
    setEditor({
      workflowId: w.id,
      name: w.name,
      description: w.description,
      steps: w.steps.map(s => ({
        agent_id: String(s.agent_id),
        task_title: s.task_title,
        task_description: s.task_description,
      })),
    })
    setError('')
  }

  function closeEditor() {
    setEditor(null)
    setError('')
  }

  function addStep() {
    if (!editor) return
    setEditor({
      ...editor,
      steps: [...editor.steps, { agent_id: agents[0]?.id ? String(agents[0].id) : '', task_title: '', task_description: '' }],
    })
  }

  function removeStep(idx: number) {
    if (!editor) return
    setEditor({ ...editor, steps: editor.steps.filter((_, i) => i !== idx) })
  }

  function updateStep(idx: number, field: keyof StepFormData, value: string) {
    if (!editor) return
    const steps = editor.steps.map((s, i) => i === idx ? { ...s, [field]: value } : s)
    setEditor({ ...editor, steps })
  }

  async function saveWorkflow() {
    if (!editor) return
    if (!editor.name.trim()) { setError('Name is required'); return }
    setLoading(true)
    setError('')
    try {
      const payload = {
        name: editor.name,
        description: editor.description,
        steps: editor.steps.map(s => ({
          agent_id: Number(s.agent_id),
          task_title: s.task_title,
          task_description: s.task_description,
        })),
      }
      const method = editor.workflowId ? 'PUT' : 'POST'
      const path = editor.workflowId
        ? `/api/workflows/${editor.workflowId}`
        : '/api/workflows'
      const res = await apiFetch(path, {
        method,
        body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error(await res.text())
      closeEditor()
      await fetchWorkflows()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Save failed')
    } finally {
      setLoading(false)
    }
  }

  async function deleteWorkflow(id: number) {
    if (!confirm('Delete this workflow?')) return
    await apiFetch(`/api/workflows/${id}`, { method: 'DELETE' })
    setWorkflows(prev => prev.filter(w => w.id !== id))
  }

  async function runWorkflow(id: number) {
    const res = await apiFetch(`/api/workflows/${id}/run`, { method: 'POST' })
    if (!res.ok) { alert('Failed to start run'); return }
    const data = await res.json()
    router.push(`/workflow-runs/${data.run_id}`)
  }

  function toggleRuns(id: number) {
    setExpandedRuns(prev => ({ ...prev, [id]: !prev[id] }))
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white">Workflows</h1>
        {!editor && (
          <button
            onClick={openCreate}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm"
          >
            <Plus size={16} />
            New Workflow
          </button>
        )}
      </div>

      {/* Inline editor */}
      {editor && (
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white">
              {editor.workflowId ? 'Edit Workflow' : 'New Workflow'}
            </h2>
            <button onClick={closeEditor} className="text-gray-400 hover:text-white">
              <X size={18} />
            </button>
          </div>

          {error && <p className="text-red-400 text-sm mb-4">{error}</p>}

          <div className="space-y-4 mb-6">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Name</label>
              <input
                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
                value={editor.name}
                onChange={e => setEditor({ ...editor, name: e.target.value })}
                placeholder="My Workflow"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Description</label>
              <input
                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
                value={editor.description}
                onChange={e => setEditor({ ...editor, description: e.target.value })}
                placeholder="Optional description"
              />
            </div>
          </div>

          <div className="mb-4">
            <h3 className="text-sm font-semibold text-gray-300 mb-3">Steps</h3>
            {editor.steps.length === 0 && (
              <p className="text-gray-500 text-sm italic mb-3">No steps yet. Add a step below.</p>
            )}
            <div className="space-y-4">
              {editor.steps.map((step, idx) => (
                <div key={idx} className="bg-gray-900 border border-gray-700 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
                      Step {idx + 1}
                    </span>
                    <button
                      onClick={() => removeStep(idx)}
                      className="text-gray-500 hover:text-red-400"
                    >
                      <X size={14} />
                    </button>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Agent</label>
                      <select
                        className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
                        value={step.agent_id}
                        onChange={e => updateStep(idx, 'agent_id', e.target.value)}
                      >
                        {agents.map(a => (
                          <option key={a.id} value={a.id}>{a.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Task Title</label>
                      <input
                        className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
                        value={step.task_title}
                        onChange={e => updateStep(idx, 'task_title', e.target.value)}
                        placeholder="e.g. Research topic"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Task Description</label>
                      <textarea
                        className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500 resize-none"
                        rows={3}
                        value={step.task_description}
                        onChange={e => updateStep(idx, 'task_description', e.target.value)}
                        placeholder="Use {{previous_output}} to reference the previous step's result"
                      />
                      <p className="text-xs text-gray-600 mt-1">
                        Tip: use <code className="text-gray-400">{'{{previous_output}}'}</code> to pass the previous step's result.
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <button
              onClick={addStep}
              className="mt-3 flex items-center gap-2 px-3 py-2 border border-dashed border-gray-600 hover:border-blue-500 text-gray-400 hover:text-blue-400 rounded-lg text-sm w-full justify-center"
            >
              <Plus size={14} />
              Add Step
            </button>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={saveWorkflow}
              disabled={loading}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium"
            >
              {loading ? 'Saving...' : 'Save'}
            </button>
            <button
              onClick={closeEditor}
              className="px-5 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Workflow cards */}
      <div className="space-y-4">
        {workflows.length === 0 && !editor && (
          <div className="text-center py-16 text-gray-500">
            No workflows yet. Create one to get started.
          </div>
        )}
        {workflows.map(w => {
          const runs = recentRuns[w.id] || []
          const showRuns = expandedRuns[w.id]
          return (
            <div key={w.id} className="bg-gray-800 border border-gray-700 rounded-xl p-5">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <h3 className="text-white font-semibold text-base truncate">{w.name}</h3>
                  {w.description && (
                    <p className="text-gray-400 text-sm mt-0.5 truncate">{w.description}</p>
                  )}
                  <p className="text-gray-500 text-xs mt-1">
                    {w.steps.length} step{w.steps.length !== 1 ? 's' : ''}
                  </p>
                </div>
                <div className="flex items-center gap-2 ml-4 shrink-0">
                  <button
                    onClick={() => runWorkflow(w.id)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-green-700 hover:bg-green-600 text-white rounded-lg text-xs font-medium"
                    title="Run workflow"
                  >
                    <Play size={13} />
                    Run
                  </button>
                  <button
                    onClick={() => openEdit(w)}
                    className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg"
                    title="Edit"
                  >
                    <Pencil size={15} />
                  </button>
                  <button
                    onClick={() => deleteWorkflow(w.id)}
                    className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-gray-700 rounded-lg"
                    title="Delete"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>

              {/* Steps preview */}
              {w.steps.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {w.steps.map((s, idx) => {
                    const agent = agents.find(a => a.id === s.agent_id)
                    return (
                      <span key={s.id} className="text-xs bg-gray-700 text-gray-300 rounded px-2 py-1">
                        {idx + 1}. {s.task_title} <span className="text-gray-500">({agent?.name ?? `Agent ${s.agent_id}`})</span>
                      </span>
                    )
                  })}
                </div>
              )}

              {/* Recent runs */}
              {runs.length > 0 && (
                <div className="mt-4">
                  <button
                    onClick={() => toggleRuns(w.id)}
                    className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-200"
                  >
                    {showRuns ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                    Recent runs ({runs.length})
                  </button>
                  {showRuns && (
                    <div className="mt-2 space-y-1">
                      {runs.map(run => (
                        <div
                          key={run.id}
                          className="flex items-center justify-between text-xs cursor-pointer hover:bg-gray-700 rounded px-2 py-1"
                          onClick={() => router.push(`/workflow-runs/${run.id}`)}
                        >
                          <span className="text-gray-400">Run #{run.id}</span>
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${statusBadge(run.status)}`}>
                            {run.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
