'use client'

import { useEffect, useState } from 'react'
import { apiFetch, API_BASE } from '@/lib/api'
import { ScheduledJob, Agent } from '@/types'

const emptyForm = {
  name: '',
  agent_id: '',
  cron_expr: '',
  task_title: '',
  task_description: '',
  enabled: true,
}

export default function SchedulesPage() {
  const [jobs, setJobs] = useState<ScheduledJob[]>([])
  const [agents, setAgents] = useState<Agent[]>([])
  const [form, setForm] = useState(emptyForm)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copiedToken, setCopiedToken] = useState<string | null>(null)

  async function fetchAll() {
    const [jobsRes, agentsRes] = await Promise.all([
      apiFetch('/api/scheduled-jobs'),
      apiFetch('/api/agents/'),
    ])
    setJobs(await jobsRes.json())
    setAgents(await agentsRes.json())
  }

  useEffect(() => {
    fetchAll()
  }, [])

  function agentName(id: number) {
    return agents.find((a) => a.id === id)?.name ?? String(id)
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!form.agent_id) {
      setError('Please select an agent.')
      return
    }
    setSubmitting(true)
    try {
      const res = await apiFetch('/api/scheduled-jobs', {
        method: 'POST',
        body: JSON.stringify({
          ...form,
          agent_id: parseInt(form.agent_id),
        }),
      })
      if (!res.ok) {
        const data = await res.json()
        setError(data.detail ?? 'Failed to create schedule.')
        return
      }
      setForm(emptyForm)
      await fetchAll()
    } finally {
      setSubmitting(false)
    }
  }

  async function toggleEnabled(job: ScheduledJob) {
    await apiFetch(`/api/scheduled-jobs/${job.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ enabled: !job.enabled }),
    })
    await fetchAll()
  }

  async function handleDelete(id: number) {
    if (!confirm('Delete this scheduled job?')) return
    await apiFetch(`/api/scheduled-jobs/${id}`, { method: 'DELETE' })
    await fetchAll()
  }

  function copyToClipboard(text: string, token: string) {
    navigator.clipboard.writeText(text)
    setCopiedToken(token)
    setTimeout(() => setCopiedToken(null), 2000)
  }

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold text-white mb-8">Schedules</h1>

      {/* Create form */}
      <div className="bg-gray-800 rounded-xl p-6 mb-8 border border-gray-700">
        <h2 className="text-lg font-semibold text-white mb-4">New Schedule</h2>
        {error && (
          <div className="mb-4 text-red-400 bg-red-900/30 border border-red-700 rounded p-3 text-sm">
            {error}
          </div>
        )}
        <form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">Name</label>
            <input
              className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
              placeholder="Daily report"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1">Agent</label>
            <select
              className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
              value={form.agent_id}
              onChange={(e) => setForm({ ...form, agent_id: e.target.value })}
              required
            >
              <option value="">Select agent…</option>
              {agents.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1">Cron Expression</label>
            <input
              className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
              value={form.cron_expr}
              onChange={(e) => setForm({ ...form, cron_expr: e.target.value })}
              required
              placeholder="0 9 * * 1-5"
            />
            <p className="text-xs text-gray-500 mt-1">5-field cron: minute hour day month weekday</p>
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1">Task Title</label>
            <input
              className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
              value={form.task_title}
              onChange={(e) => setForm({ ...form, task_title: e.target.value })}
              required
              placeholder="Run daily report"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm text-gray-400 mb-1">Task Description</label>
            <textarea
              className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500 resize-none"
              rows={3}
              value={form.task_description}
              onChange={(e) => setForm({ ...form, task_description: e.target.value })}
              placeholder="Describe what the agent should do…"
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="enabled-new"
              checked={form.enabled}
              onChange={(e) => setForm({ ...form, enabled: e.target.checked })}
              className="accent-blue-500"
            />
            <label htmlFor="enabled-new" className="text-sm text-gray-300">
              Enabled
            </label>
          </div>

          <div className="md:col-span-2 flex justify-end">
            <button
              type="submit"
              disabled={submitting}
              className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-6 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              {submitting ? 'Creating…' : 'Create Schedule'}
            </button>
          </div>
        </form>
      </div>

      {/* Jobs table */}
      {jobs.length === 0 ? (
        <div className="text-gray-500 text-center py-16 bg-gray-800 rounded-xl border border-gray-700">
          No scheduled jobs yet. Create one above.
        </div>
      ) : (
        <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-700 text-gray-400 text-left">
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Agent</th>
                <th className="px-4 py-3 font-medium">Cron</th>
                <th className="px-4 py-3 font-medium">Task Template</th>
                <th className="px-4 py-3 font-medium">Last Run</th>
                <th className="px-4 py-3 font-medium">Webhook</th>
                <th className="px-4 py-3 font-medium">Enabled</th>
                <th className="px-4 py-3 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {jobs.map((job) => (
                <tr key={job.id} className="border-b border-gray-700 hover:bg-gray-750">
                  <td className="px-4 py-3 text-white font-medium">{job.name}</td>
                  <td className="px-4 py-3 text-gray-300">{agentName(job.agent_id)}</td>
                  <td className="px-4 py-3">
                    <code className="bg-gray-900 px-2 py-0.5 rounded text-blue-300 text-xs">
                      {job.cron_expr}
                    </code>
                  </td>
                  <td className="px-4 py-3 text-gray-300 max-w-xs truncate" title={job.task_title}>
                    {job.task_title}
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-xs">
                    {job.last_run_at
                      ? new Date(job.last_run_at).toLocaleString()
                      : 'Never'}
                  </td>
                  <td className="px-4 py-3">
                    {job.webhook_token ? (
                      <div className="flex items-center gap-2">
                        <code className="bg-gray-900 px-2 py-0.5 rounded text-green-300 text-xs truncate max-w-[160px]">
                          POST /api/webhooks/{job.webhook_token}
                        </code>
                        <button
                          onClick={() =>
                            copyToClipboard(
                              `${API_BASE}/api/webhooks/${job.webhook_token}`,
                              job.webhook_token!
                            )
                          }
                          className="text-gray-400 hover:text-white text-xs px-1"
                          title="Copy webhook URL"
                        >
                          {copiedToken === job.webhook_token ? 'Copied!' : 'Copy'}
                        </button>
                      </div>
                    ) : (
                      <span className="text-gray-600 text-xs">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => toggleEnabled(job)}
                      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none ${
                        job.enabled ? 'bg-blue-600' : 'bg-gray-600'
                      }`}
                      title={job.enabled ? 'Disable' : 'Enable'}
                    >
                      <span
                        className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                          job.enabled ? 'translate-x-4' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => handleDelete(job.id)}
                      className="text-red-400 hover:text-red-300 text-xs font-medium transition-colors"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
