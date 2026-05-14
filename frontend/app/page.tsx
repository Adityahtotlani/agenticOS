'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts'
import { DollarSign, Zap, Activity, Clock } from 'lucide-react'
import { apiFetch } from '@/lib/api'
import { Agent, Task, MetricsSummary, TimeseriesPoint } from '@/types'

// ---------------------------------------------------------------------------
// Helper components
// ---------------------------------------------------------------------------

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    pending: 'bg-gray-700 text-gray-300',
    queued: 'bg-yellow-900 text-yellow-300',
    running: 'bg-blue-900 text-blue-300',
    completed: 'bg-green-900 text-green-300',
    failed: 'bg-red-900 text-red-300',
  }
  return (
    <span
      className={`px-2 py-0.5 rounded text-xs font-medium ${
        colors[status] ?? 'bg-gray-700 text-gray-300'
      }`}
    >
      {status}
    </span>
  )
}

interface StatCardProps {
  label: string
  value: string
  icon: React.ReactNode
  iconBg: string
  sub?: string
}

function StatCard({ label, value, icon, iconBg, sub }: StatCardProps) {
  return (
    <div className="bg-gray-800 rounded-xl p-5 border border-gray-700 flex items-start gap-4">
      <div className={`p-2.5 rounded-lg ${iconBg} shrink-0`}>{icon}</div>
      <div className="min-w-0">
        <p className="text-xs text-gray-400 mb-1">{label}</p>
        <p className="text-2xl font-bold text-white leading-none">{value}</p>
        {sub && <p className="text-xs text-gray-500 mt-1">{sub}</p>}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function DashboardPage() {
  const [summary1d, setSummary1d] = useState<MetricsSummary | null>(null)
  const [summary30d, setSummary30d] = useState<MetricsSummary | null>(null)
  const [weekSeries, setWeekSeries] = useState<TimeseriesPoint[]>([])
  const [agents, setAgents] = useState<Agent[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)

  const fetchAll = async () => {
    try {
      const [s1Res, s30Res, tsRes, agRes, tkRes] = await Promise.all([
        apiFetch('/api/metrics/summary?days=1'),
        apiFetch('/api/metrics/summary?days=30'),
        apiFetch('/api/metrics/timeseries?days=7&bucket=day'),
        apiFetch('/api/agents'),
        apiFetch('/api/tasks'),
      ])

      const [s1, s30, ts, ag, tk] = await Promise.all([
        s1Res.ok ? s1Res.json() : null,
        s30Res.ok ? s30Res.json() : null,
        tsRes.ok ? tsRes.json() : [],
        agRes.ok ? agRes.json() : [],
        tkRes.ok ? tkRes.json() : [],
      ])

      if (s1 && !s1.detail) setSummary1d(s1)
      if (s30 && !s30.detail) setSummary30d(s30)
      setWeekSeries(Array.isArray(ts) ? ts : [])
      setAgents(Array.isArray(ag) ? ag : [])
      setTasks(Array.isArray(tk) ? tk : [])
    } catch (err) {
      console.error('Dashboard fetch error:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAll()
    const id = setInterval(fetchAll, 5000)
    return () => clearInterval(id)
  }, [])

  const runningAgents = agents.filter((a) => a.status === 'running')
  const recentTasks = [...tasks].sort((a, b) => b.id - a.id).slice(0, 10)
  const agentMap = Object.fromEntries(agents.map((a) => [a.id, a.name]))
  const agentName = (id: number | null) => (id != null ? agentMap[id] ?? `#${id}` : '—')

  const fmtUsd = (n: number) => (n < 0.01 ? `$${n.toFixed(4)}` : `$${n.toFixed(2)}`)
  const fmtMs = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(1)}s` : `${Math.round(n)}ms`)

  return (
    <div className="p-8 max-w-7xl">
      {/* ------------------------------------------------------------------ */}
      {/* Header                                                              */}
      {/* ------------------------------------------------------------------ */}
      <div className="flex items-start justify-between mb-8 gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold text-white">Dashboard</h1>
          <p className="text-gray-400 text-sm mt-1">
            Today:&nbsp;
            <span className="text-gray-200">{fmtUsd(summary1d?.total_cost_usd ?? 0)}</span>
            &nbsp;·&nbsp;
            <span className="text-gray-200">{summary1d?.total_runs ?? 0}</span> runs
            {(summary1d?.total_errors ?? 0) > 0 && (
              <span className="text-red-400 ml-2">
                · {summary1d!.total_errors} error{summary1d!.total_errors !== 1 ? 's' : ''}
              </span>
            )}
            {loading && (
              <span className="text-gray-600 ml-2 animate-pulse">loading…</span>
            )}
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Link
            href="/agents/new"
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-medium transition-colors text-white"
          >
            + Agent
          </Link>
          <Link
            href="/tasks/new"
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm font-medium transition-colors text-white"
          >
            + Task
          </Link>
          <Link
            href="/workflows"
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm font-medium transition-colors text-white"
          >
            + Workflow
          </Link>
        </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Stat cards                                                          */}
      {/* ------------------------------------------------------------------ */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          label="Total Cost (30d)"
          value={fmtUsd(summary30d?.total_cost_usd ?? 0)}
          icon={<DollarSign size={18} className="text-green-400" />}
          iconBg="bg-green-900/40"
          sub={`${summary30d?.total_runs ?? 0} runs`}
        />
        <StatCard
          label="Total Runs (30d)"
          value={String(summary30d?.total_runs ?? 0)}
          icon={<Zap size={18} className="text-blue-400" />}
          iconBg="bg-blue-900/40"
          sub={
            (summary30d?.total_errors ?? 0) > 0
              ? `${summary30d!.total_errors} errors`
              : 'no errors'
          }
        />
        <StatCard
          label="Active Agents"
          value={String(runningAgents.length)}
          icon={<Activity size={18} className="text-purple-400" />}
          iconBg="bg-purple-900/40"
          sub={`${agents.length} total`}
        />
        <StatCard
          label="Avg Latency (1d)"
          value={fmtMs(summary1d?.avg_latency_ms ?? 0)}
          icon={<Clock size={18} className="text-gray-400" />}
          iconBg="bg-gray-700"
          sub={`${summary1d?.total_runs ?? 0} runs today`}
        />
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Middle: active agents + weekly cost sparkline                      */}
      {/* ------------------------------------------------------------------ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Active Agents */}
        <div className="bg-gray-800 rounded-xl p-5 border border-gray-700">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-gray-300">Active Agents</h2>
            <Link href="/agents" className="text-xs text-blue-400 hover:underline">
              View all →
            </Link>
          </div>
          {runningAgents.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Activity size={32} className="text-gray-600 mb-2" />
              <p className="text-gray-500 text-sm">No agents running</p>
              <Link
                href="/agents/new"
                className="text-xs text-blue-400 hover:underline mt-1"
              >
                Create an agent
              </Link>
            </div>
          ) : (
            <div className="space-y-2">
              {runningAgents.map((agent) => (
                <Link key={agent.id} href={`/agents/${agent.id}`}>
                  <div className="flex items-center justify-between p-3 bg-gray-900 rounded-lg hover:bg-gray-700 transition-colors">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-white truncate">
                        {agent.name}
                      </p>
                      <p className="text-xs text-gray-400">{agent.model}</p>
                    </div>
                    <span className="flex items-center gap-1.5 text-xs text-blue-400 shrink-0 ml-3">
                      <span className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" />
                      running
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Cost This Week */}
        <div className="bg-gray-800 rounded-xl p-5 border border-gray-700">
          <h2 className="text-sm font-semibold text-gray-300 mb-3">Cost This Week</h2>
          {weekSeries.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-center">
              <DollarSign size={32} className="text-gray-600 mb-2" />
              <p className="text-gray-500 text-sm">No cost data yet</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={weekSeries} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <XAxis
                  dataKey="bucket"
                  tick={{ fontSize: 10, fill: '#9ca3af' }}
                  stroke="#374151"
                  tickFormatter={(v: string) => v.slice(5)}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: '#9ca3af' }}
                  stroke="#374151"
                  tickFormatter={(v: number) => `$${v.toFixed(3)}`}
                />
                <Tooltip
                  contentStyle={{
                    background: '#111827',
                    border: '1px solid #374151',
                    borderRadius: 6,
                    fontSize: 11,
                  }}
                  labelStyle={{ color: '#d1d5db' }}
                  formatter={(v: number) => [`$${v.toFixed(4)}`, 'Cost']}
                />
                <Bar dataKey="cost_usd" fill="#3b82f6" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
          {weekSeries.length > 0 && (
            <p className="text-xs text-gray-500 mt-2 text-right">
              Total:{' '}
              <span className="text-gray-300">
                {fmtUsd(weekSeries.reduce((s, p) => s + (p.cost_usd ?? 0), 0))}
              </span>
            </p>
          )}
        </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Recent Tasks table                                                  */}
      {/* ------------------------------------------------------------------ */}
      <div className="bg-gray-800 rounded-xl border border-gray-700">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-700">
          <h2 className="text-sm font-semibold text-gray-300">Recent Tasks</h2>
          <Link href="/tasks" className="text-xs text-blue-400 hover:underline">
            View all →
          </Link>
        </div>

        {recentTasks.length === 0 ? (
          <p className="text-gray-500 text-sm text-center py-10">
            No tasks yet.{' '}
            <Link href="/tasks/new" className="text-blue-400 hover:underline">
              Create one
            </Link>
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-gray-500 uppercase border-b border-gray-700">
                  <th className="text-left px-5 py-2">Title</th>
                  <th className="text-left px-5 py-2">Agent</th>
                  <th className="text-left px-5 py-2">Status</th>
                  <th className="text-right px-5 py-2">ID</th>
                </tr>
              </thead>
              <tbody>
                {recentTasks.map((task) => (
                  <tr
                    key={task.id}
                    className="border-b border-gray-700/50 hover:bg-gray-700/30 transition-colors"
                  >
                    <td className="px-5 py-3">
                      <Link
                        href={`/tasks/${task.id}`}
                        className="hover:text-blue-400 transition-colors truncate block max-w-xs text-white"
                      >
                        {task.title || '(untitled)'}
                      </Link>
                    </td>
                    <td className="px-5 py-3 text-gray-400 text-sm">
                      {agentName(task.agent_id)}
                    </td>
                    <td className="px-5 py-3">
                      <StatusBadge status={task.status} />
                    </td>
                    <td className="px-5 py-3 text-right text-gray-500 text-xs">
                      #{task.id}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
