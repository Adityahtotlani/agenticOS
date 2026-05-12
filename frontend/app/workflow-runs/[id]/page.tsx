'use client'

import { useEffect, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { apiFetch } from '@/lib/api'
import { WorkflowRun, WorkflowStepRun, Workflow } from '@/types'
import { Agent } from '@/types'
import { ArrowLeft, ExternalLink } from 'lucide-react'

function statusColor(status: string): string {
  switch (status) {
    case 'completed': return 'text-green-400'
    case 'running': return 'text-blue-400'
    case 'failed': return 'text-red-400'
    default: return 'text-gray-400'
  }
}

function statusBadgeClass(status: string): string {
  switch (status) {
    case 'completed': return 'bg-green-800 text-green-200'
    case 'running': return 'bg-blue-800 text-blue-200 animate-pulse'
    case 'failed': return 'bg-red-800 text-red-200'
    default: return 'bg-gray-700 text-gray-400'
  }
}

function circleClass(status: string): string {
  switch (status) {
    case 'completed': return 'bg-green-500 border-green-400'
    case 'running': return 'bg-blue-500 border-blue-400 animate-pulse'
    case 'failed': return 'bg-red-500 border-red-400'
    default: return 'bg-gray-600 border-gray-500'
  }
}

export default function WorkflowRunPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [run, setRun] = useState<WorkflowRun | null>(null)
  const [workflow, setWorkflow] = useState<Workflow | null>(null)
  const [agents, setAgents] = useState<Agent[]>([])
  const [error, setError] = useState('')
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  async function fetchRun() {
    try {
      const res = await apiFetch(`/api/workflow-runs/${id}`)
      if (!res.ok) { setError('Run not found'); return }
      const data: WorkflowRun = await res.json()
      setRun(data)

      if (data.status === 'completed' || data.status === 'failed') {
        if (intervalRef.current) clearInterval(intervalRef.current)
      }
    } catch {
      setError('Failed to load run')
    }
  }

  async function fetchWorkflowAndAgents(workflowId: number) {
    const [wRes, aRes] = await Promise.all([
      apiFetch(`/api/workflows/${workflowId}`),
      apiFetch('/api/agents'),
    ])
    if (wRes.ok) setWorkflow(await wRes.json())
    if (aRes.ok) setAgents(await aRes.json())
  }

  useEffect(() => {
    fetchRun()
    intervalRef.current = setInterval(fetchRun, 2000)
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [id])

  useEffect(() => {
    if (run && !workflow) fetchWorkflowAndAgents(run.workflow_id)
  }, [run?.workflow_id])

  if (error) {
    return (
      <div className="p-6">
        <p className="text-red-400">{error}</p>
        <button onClick={() => router.push('/workflows')} className="mt-4 text-blue-400 hover:underline text-sm">
          Back to Workflows
        </button>
      </div>
    )
  }

  if (!run) {
    return (
      <div className="p-6 text-gray-400">Loading...</div>
    )
  }

  // Build a map from step_id to step info
  const stepMap: Record<number, { step_order: number; agent_id: number; task_title: string }> = {}
  if (workflow) {
    workflow.steps.forEach(s => {
      stepMap[s.id] = { step_order: s.step_order, agent_id: s.agent_id, task_title: s.task_title }
    })
  }

  const agentMap: Record<number, string> = {}
  agents.forEach(a => { agentMap[a.id] = a.name })

  // Sort step_runs by step_order
  const sortedStepRuns = [...run.step_runs].sort((a, b) => {
    const orderA = stepMap[a.step_id]?.step_order ?? 0
    const orderB = stepMap[b.step_id]?.step_order ?? 0
    return orderA - orderB
  })

  return (
    <div className="p-6 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => router.push('/workflows')}
          className="text-gray-400 hover:text-white"
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-xl font-bold text-white">
            Workflow Run #{run.id}
          </h1>
          {workflow && (
            <p className="text-gray-400 text-sm">{workflow.name}</p>
          )}
        </div>
        <span className={`ml-auto px-3 py-1 rounded-full text-xs font-semibold ${statusBadgeClass(run.status)}`}>
          {run.status}
        </span>
      </div>

      {/* Timestamps */}
      <div className="bg-gray-800 border border-gray-700 rounded-xl p-4 mb-6 text-sm text-gray-400 flex gap-6">
        <div>
          <span className="text-gray-500">Started:</span>{' '}
          {run.started_at ? new Date(run.started_at).toLocaleString() : 'N/A'}
        </div>
        {run.ended_at && (
          <div>
            <span className="text-gray-500">Ended:</span>{' '}
            {new Date(run.ended_at).toLocaleString()}
          </div>
        )}
      </div>

      {/* Pipeline */}
      <div className="relative">
        {sortedStepRuns.map((sr, idx) => {
          const stepInfo = stepMap[sr.step_id]
          const agentId = stepInfo?.agent_id
          const agentName = agentId ? (agentMap[agentId] ?? `Agent ${agentId}`) : 'Unknown'
          const taskTitle = stepInfo?.task_title ?? `Step ${idx + 1}`
          const isLast = idx === sortedStepRuns.length - 1

          return (
            <div key={sr.id} className="flex gap-4">
              {/* Left timeline */}
              <div className="flex flex-col items-center" style={{ width: 24 }}>
                <div className={`w-4 h-4 rounded-full border-2 shrink-0 mt-0.5 ${circleClass(sr.status)}`} />
                {!isLast && (
                  <div className="w-0.5 bg-gray-700 flex-1 mt-1 mb-0" style={{ minHeight: 32 }} />
                )}
              </div>

              {/* Step content */}
              <div className={`flex-1 pb-6 ${isLast ? '' : ''}`}>
                <div className="bg-gray-800 border border-gray-700 rounded-xl p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-medium text-sm truncate">
                        Step {(stepInfo?.step_order ?? idx) + 1}: {taskTitle}
                      </p>
                      <p className="text-gray-400 text-xs mt-0.5">{agentName}</p>
                    </div>
                    <span className={`shrink-0 px-2 py-0.5 rounded text-xs font-semibold ${statusBadgeClass(sr.status)}`}>
                      {sr.status}
                    </span>
                  </div>

                  {/* Timestamps */}
                  {(sr.started_at || sr.ended_at) && (
                    <div className="mt-2 text-xs text-gray-500 flex gap-4">
                      {sr.started_at && (
                        <span>Started: {new Date(sr.started_at).toLocaleTimeString()}</span>
                      )}
                      {sr.ended_at && (
                        <span>Ended: {new Date(sr.ended_at).toLocaleTimeString()}</span>
                      )}
                    </div>
                  )}

                  {/* Error */}
                  {sr.error && (
                    <div className="mt-2 text-xs text-red-400 bg-red-900/30 rounded p-2">
                      {sr.error}
                    </div>
                  )}

                  {/* View task link */}
                  {sr.task_id && agentId && (
                    <div className="mt-2">
                      <Link
                        href={`/agents/${agentId}`}
                        className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300"
                      >
                        <ExternalLink size={11} />
                        View Agent Output
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )
        })}

        {sortedStepRuns.length === 0 && (
          <p className="text-gray-500 text-sm">No steps recorded yet.</p>
        )}
      </div>
    </div>
  )
}
