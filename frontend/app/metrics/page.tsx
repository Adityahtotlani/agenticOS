'use client'

import { useEffect, useState } from 'react'
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  BarChart,
  Bar,
} from 'recharts'
import { API_BASE } from '@/lib/api'
import { MetricsSummary, AgentMetric, TimeseriesPoint, AgentRun } from '@/types'
import { DollarSign, Zap, AlertTriangle, Clock } from 'lucide-react'

const fmtUsd = (n: number) =>
  n < 0.01 ? `$${n.toFixed(6)}` : `$${n.toFixed(n < 1 ? 4 : 2)}`

const fmtNum = (n: number) => n.toLocaleString()

export default function MetricsPage() {
  const [days, setDays] = useState(30)
  const [bucket, setBucket] = useState<'hour' | 'day'>('day')
  const [summary, setSummary] = useState<MetricsSummary | null>(null)
  const [byAgent, setByAgent] = useState<AgentMetric[]>([])
  const [series, setSeries] = useState<TimeseriesPoint[]>([])
  const [recent, setRecent] = useState<AgentRun[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchAll()
    const id = setInterval(fetchAll, 10000)
    return () => clearInterval(id)
  }, [days, bucket])

  const fetchAll = async () => {
    try {
      const [s, a, t, r] = await Promise.all([
        fetch(`${API_BASE}/api/metrics/summary?days=${days}`).then(r => r.json()),
        fetch(`${API_BASE}/api/metrics/by-agent?days=${days}`).then(r => r.json()),
        fetch(`${API_BASE}/api/metrics/timeseries?days=${days}&bucket=${bucket}`).then(r => r.json()),
        fetch(`${API_BASE}/api/metrics/recent-runs?limit=50`).then(r => r.json()),
      ])
      setSummary(s)
      setByAgent(a)
      setSeries(t)
      setRecent(r)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-8 max-w-7xl">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold">Metrics</h1>
        <div className="flex gap-2">
          <select
            value={days}
            onChange={(e) => setDays(parseInt(e.target.value))}
            className="px-3 py-1.5 bg-gray-800 border border-gray-700 rounded text-sm"
          >
            <option value={1}>Last 24h</option>
            <option value={7}>Last 7 days</option>
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
          </select>
          <select
            value={bucket}
            onChange={(e) => setBucket(e.target.value as 'hour' | 'day')}
            className="px-3 py-1.5 bg-gray-800 border border-gray-700 rounded text-sm"
          >
            <option value="hour">Hourly</option>
            <option value="day">Daily</option>
          </select>
        </div>
      </div>

      {loading && !summary ? (
        <p className="text-gray-400">Loading...</p>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <StatCard
              label="Total cost"
              value={summary ? fmtUsd(summary.total_cost_usd) : '—'}
              icon={<DollarSign size={18} />}
              accent="text-green-400"
            />
            <StatCard
              label="Total runs"
              value={summary ? fmtNum(summary.total_runs) : '—'}
              icon={<Zap size={18} />}
              accent="text-blue-400"
            />
            <StatCard
              label="Error rate"
              value={summary ? `${(summary.error_rate * 100).toFixed(1)}%` : '—'}
              icon={<AlertTriangle size={18} />}
              accent={
                summary && summary.error_rate > 0.05 ? 'text-red-400' : 'text-gray-300'
              }
            />
            <StatCard
              label="Avg latency"
              value={summary ? `${summary.avg_latency_ms} ms` : '—'}
              icon={<Clock size={18} />}
              accent="text-purple-400"
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <Panel title="Cost over time">
              {series.length === 0 ? (
                <EmptyChart />
              ) : (
                <ResponsiveContainer width="100%" height={240}>
                  <LineChart data={series}>
                    <CartesianGrid stroke="#1f2937" strokeDasharray="3 3" />
                    <XAxis dataKey="bucket" stroke="#6b7280" tick={{ fontSize: 11 }} />
                    <YAxis stroke="#6b7280" tick={{ fontSize: 11 }} />
                    <Tooltip
                      contentStyle={{ background: '#111827', border: '1px solid #374151', fontSize: 12 }}
                      formatter={(v: number) => fmtUsd(v)}
                    />
                    <Line type="monotone" dataKey="cost_usd" stroke="#10b981" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </Panel>

            <Panel title="Cost by agent">
              {byAgent.length === 0 ? (
                <EmptyChart />
              ) : (
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={byAgent.slice(0, 10)}>
                    <CartesianGrid stroke="#1f2937" strokeDasharray="3 3" />
                    <XAxis
                      dataKey="agent_name"
                      stroke="#6b7280"
                      tick={{ fontSize: 11 }}
                      angle={-20}
                      textAnchor="end"
                      height={60}
                    />
                    <YAxis stroke="#6b7280" tick={{ fontSize: 11 }} />
                    <Tooltip
                      contentStyle={{ background: '#111827', border: '1px solid #374151', fontSize: 12 }}
                      formatter={(v: number) => fmtUsd(v)}
                    />
                    <Bar dataKey="cost_usd" fill="#3b82f6" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </Panel>
          </div>

          <Panel title={`Recent runs (${recent.length})`}>
            {recent.length === 0 ? (
              <p className="text-gray-500 text-sm py-6 text-center">No runs yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-xs text-gray-400 uppercase tracking-wider">
                    <tr className="border-b border-gray-800">
                      <th className="text-left p-2">Agent</th>
                      <th className="text-left p-2">Model</th>
                      <th className="text-left p-2">When</th>
                      <th className="text-right p-2">In</th>
                      <th className="text-right p-2">Out</th>
                      <th className="text-right p-2">Latency</th>
                      <th className="text-right p-2">Cost</th>
                      <th className="text-left p-2">Stop</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recent.map(r => (
                      <tr key={r.id} className="border-b border-gray-900 hover:bg-gray-900/50">
                        <td className="p-2">{r.agent_name}</td>
                        <td className="p-2 font-mono text-xs text-gray-400">{r.model}</td>
                        <td className="p-2 text-xs text-gray-500">
                          {r.started_at ? new Date(r.started_at).toLocaleString() : '—'}
                        </td>
                        <td className="p-2 text-right">{fmtNum(r.input_tokens)}</td>
                        <td className="p-2 text-right">{fmtNum(r.output_tokens)}</td>
                        <td className="p-2 text-right text-gray-400">{r.latency_ms} ms</td>
                        <td className="p-2 text-right font-medium">{fmtUsd(r.cost_usd)}</td>
                        <td className="p-2">
                          {r.error ? (
                            <span className="text-red-400 text-xs">{r.error.slice(0, 40)}</span>
                          ) : (
                            <span className="text-xs text-gray-500">{r.stop_reason || '—'}</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Panel>
        </>
      )}
    </div>
  )
}

function StatCard({
  label,
  value,
  icon,
  accent,
}: {
  label: string
  value: string
  icon: React.ReactNode
  accent: string
}) {
  return (
    <div className="bg-gray-800 rounded-lg p-5 border border-gray-700">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-gray-400 uppercase tracking-wider">{label}</span>
        <span className={accent}>{icon}</span>
      </div>
      <div className="text-2xl font-semibold">{value}</div>
    </div>
  )
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-gray-800 rounded-lg p-5 border border-gray-700">
      <h2 className="text-sm font-semibold mb-4 text-gray-300">{title}</h2>
      {children}
    </div>
  )
}

function EmptyChart() {
  return (
    <div className="h-[240px] flex items-center justify-center text-gray-500 text-sm">
      No data yet
    </div>
  )
}
