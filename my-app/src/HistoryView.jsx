import { useEffect, useState } from 'react'
import { ALL_MODELS, PROVIDER_COLOR } from './models'
import { PrettyView } from './ResultView'

function StatsChart({ stats }) {
  if (!stats.length) {
    return <p className="text-sm text-gray-400">No test results yet — run some tests first.</p>
  }

  const maxMs = Math.max(...stats.map((s) => s.avgElapsedMs))
  const providers = [...new Set(stats.map((s) => s.provider))]

  return (
    <div>
      <div className="space-y-2.5">
        {stats.map((s) => {
          const widthPct = Math.max((s.avgElapsedMs / maxMs) * 100, 4)
          const color = PROVIDER_COLOR[s.provider]?.light || '#898781'
          return (
            <div key={`${s.provider}::${s.model}`} className="group">
              <div className="flex justify-between text-xs text-gray-500 mb-0.5">
                <span className="truncate">{s.model}</span>
                <span className="shrink-0 ml-2 font-medium text-gray-700">
                  {s.avgElapsedMs < 1000 ? `${s.avgElapsedMs}ms` : `${(s.avgElapsedMs / 1000).toFixed(1)}s`}
                </span>
              </div>
              <div className="h-2.5 rounded-full bg-gray-100 overflow-hidden relative">
                <div
                  className="h-full rounded-full transition-all"
                  style={{ width: `${widthPct}%`, background: color }}
                  title={`${s.model}: avg ${s.avgElapsedMs}ms over ${s.count} run(s), ${s.validCount} valid JSON`}
                />
              </div>
            </div>
          )
        })}
      </div>

      <div className="flex gap-4 mt-4 text-xs text-gray-500">
        {providers.map((p) => (
          <span key={p} className="flex items-center gap-1.5">
            <span
              className="w-2.5 h-2.5 rounded-full"
              style={{ background: PROVIDER_COLOR[p]?.light || '#898781' }}
            />
            {p}
          </span>
        ))}
      </div>
    </div>
  )
}

function Skeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      {[0, 1, 2].map((i) => (
        <div key={i}>
          <div className="flex justify-between mb-1">
            <div className="h-3 w-40 bg-gray-200 rounded" />
            <div className="h-3 w-10 bg-gray-200 rounded" />
          </div>
          <div className="h-2.5 w-full bg-gray-100 rounded-full" />
        </div>
      ))}
    </div>
  )
}

function HistorySkeleton() {
  return (
    <ul className="divide-y divide-gray-100 animate-pulse">
      {[0, 1, 2, 3].map((i) => (
        <li key={i} className="py-2.5">
          <div className="flex items-center justify-between gap-2">
            <div className="h-3.5 w-32 bg-gray-200 rounded" />
            <div className="h-3 w-24 bg-gray-100 rounded" />
          </div>
          <div className="h-3 w-64 bg-gray-100 rounded mt-1.5" />
          <div className="flex gap-2 mt-1.5">
            <div className="h-3 w-14 bg-gray-100 rounded" />
            <div className="h-3 w-16 bg-gray-100 rounded" />
            <div className="h-3 w-10 bg-gray-100 rounded" />
          </div>
        </li>
      ))}
    </ul>
  )
}

function ResultFallback({ entry }) {
  if (!entry.valid || !entry.parsed) {
    return (
      <pre className="whitespace-pre-wrap text-sm text-gray-800 font-sans overflow-x-auto">
        {entry.raw || '(empty response from model)'}
      </pre>
    )
  }
  if (!entry.parsed.mode) {
    return (
      <pre className="whitespace-pre-wrap text-sm text-gray-800 font-sans overflow-x-auto">
        {JSON.stringify(entry.parsed, null, 2)}
      </pre>
    )
  }
  return <PrettyView data={entry.parsed} />
}

function CompareHistoryView({ entries, onBack }) {
  return (
    <div className="w-full max-w-6xl">
      <button
        type="button"
        onClick={onBack}
        className="text-sm text-indigo-600 hover:underline mb-4"
      >
        ← Back to history
      </button>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {entries.map((e) => (
          <div key={e._id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 min-w-0">
            <div className="flex items-center justify-between mb-2 gap-2">
              <span className="text-xs font-medium text-gray-600 truncate">
                {e.provider} / {e.model}
              </span>
              <span className="text-xs font-semibold text-indigo-700 bg-indigo-100 rounded-full px-2 py-0.5 shrink-0">
                ⏱ {e.elapsedMs < 1000 ? `${e.elapsedMs}ms` : `${(e.elapsedMs / 1000).toFixed(1)}s`}
              </span>
            </div>
            <p className="text-xs text-gray-400 whitespace-pre-wrap break-words mb-3" title={e.prompt}>{e.prompt}</p>
            <ResultFallback entry={e} />
          </div>
        ))}
      </div>
    </div>
  )
}

export default function HistoryView() {
  const [entries, setEntries] = useState([])
  const [stats, setStats] = useState([])
  const [loading, setLoading] = useState(true)
  const [filterProvider, setFilterProvider] = useState('')
  const [filterModel, setFilterModel] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [selectedIds, setSelectedIds] = useState(new Set())
  const [comparing, setComparing] = useState(false)

  const load = async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (filterProvider) params.set('provider', filterProvider)
    if (filterModel) params.set('model', filterModel)
    if (from) params.set('from', from)
    if (to) params.set('to', to)

    try {
      const [historyRes, statsRes] = await Promise.all([
        fetch(`/api/history?${params.toString()}`),
        fetch('/api/stats'),
      ])
      setEntries(await historyRes.json())
      setStats(await statsRes.json())
    } catch (err) {
      console.error('[llm-playground] Failed to load history/stats:', err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const toggleSelect = (id) => {
    const next = new Set(selectedIds)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setSelectedIds(next)
  }

  const deleteOne = async (id) => {
    if (!confirm('Delete this test result?')) return
    try {
      const res = await fetch(`/api/history/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error((await res.json()).error || 'Delete failed')
      setEntries((prev) => prev.filter((e) => e._id !== id))
      setSelectedIds((prev) => {
        const next = new Set(prev)
        next.delete(id)
        return next
      })
      console.log(`[llm-playground] Deleted history entry ${id}`)
      load()
    } catch (err) {
      console.error('[llm-playground] Failed to delete entry:', err.message)
      alert(`Failed to delete: ${err.message}`)
    }
  }

  const deleteSelected = async () => {
    if (selectedIds.size === 0) return
    if (!confirm(`Delete ${selectedIds.size} selected test result(s)?`)) return
    try {
      const res = await fetch('/api/history', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: [...selectedIds] }),
      })
      if (!res.ok) throw new Error((await res.json()).error || 'Delete failed')
      setEntries((prev) => prev.filter((e) => !selectedIds.has(e._id)))
      setSelectedIds(new Set())
      console.log(`[llm-playground] Bulk deleted ${selectedIds.size} history entries`)
      load()
    } catch (err) {
      console.error('[llm-playground] Failed to bulk delete:', err.message)
      alert(`Failed to delete: ${err.message}`)
    }
  }

  if (comparing) {
    const chosen = entries.filter((e) => selectedIds.has(e._id))
    return <CompareHistoryView entries={chosen} onBack={() => setComparing(false)} />
  }

  const modelsForProvider = filterProvider
    ? ALL_MODELS.filter((m) => m.provider === filterProvider)
    : ALL_MODELS

  return (
    <div className="w-full max-w-2xl space-y-6">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
        <h2 className="text-sm font-medium text-gray-700 mb-3">Average response time by model</h2>
        {loading ? <Skeleton /> : <StatsChart stats={stats} />}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
        <div className="flex items-center justify-between mb-3 gap-2">
          <h2 className="text-sm font-medium text-gray-700">
            Test history
            {!loading && (
              <span className="ml-2 text-xs font-normal text-gray-400">
                {entries.length} shown{stats.length > 0 && ` · ${stats.reduce((sum, s) => sum + s.count, 0)} total across all models`}
              </span>
            )}
          </h2>

          <div className="flex gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setComparing(true)}
              disabled={selectedIds.size < 2}
              className="px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-medium hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              Compare selected ({selectedIds.size})
            </button>

            <button
              type="button"
              onClick={deleteSelected}
              disabled={selectedIds.size === 0}
              className="px-3 py-1.5 rounded-lg bg-red-50 text-red-600 border border-red-200 text-xs font-medium hover:bg-red-100 disabled:bg-gray-100 disabled:text-gray-400 disabled:border-gray-200 disabled:cursor-not-allowed transition-colors"
            >
              Delete selected ({selectedIds.size})
            </button>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 mb-4">
          <select
            value={filterProvider}
            onChange={(e) => {
              setFilterProvider(e.target.value)
              setFilterModel('')
            }}
            className="rounded-lg border border-gray-300 p-1.5 text-xs bg-white"
          >
            <option value="">All providers</option>
            <option value="gemini">gemini</option>
            <option value="groq">groq</option>
            <option value="openrouter">openrouter</option>
          </select>

          <select
            value={filterModel}
            onChange={(e) => setFilterModel(e.target.value)}
            className="rounded-lg border border-gray-300 p-1.5 text-xs bg-white"
          >
            <option value="">All models</option>
            {modelsForProvider.map((m) => (
              <option key={`${m.provider}::${m.model}`} value={m.model}>
                {m.model}
              </option>
            ))}
          </select>

          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="rounded-lg border border-gray-300 p-1.5 text-xs"
          />
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="rounded-lg border border-gray-300 p-1.5 text-xs"
          />

          <button
            type="button"
            onClick={load}
            className="px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-medium hover:bg-indigo-700"
          >
            Apply filters
          </button>
        </div>

        {loading && <HistorySkeleton />}

        {!loading && entries.length === 0 && (
          <p className="text-sm text-gray-400">No history matches these filters.</p>
        )}

        {!loading && entries.length > 0 && (
          <ul className="divide-y divide-gray-100 max-h-[420px] overflow-y-auto pr-1">
              {entries.map((e) => (
                <li key={e._id} className="py-2.5 flex items-start gap-2">
                  <input
                    type="checkbox"
                    checked={selectedIds.has(e._id)}
                    onChange={() => toggleSelect(e._id)}
                    className="mt-1"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium text-gray-800 truncate">{e.model}</span>
                      <span className="text-xs text-gray-400 shrink-0">
                        {new Date(e.createdAt).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 whitespace-pre-wrap break-words mt-0.5" title={e.prompt}>{e.prompt}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-gray-400">{e.provider}</span>
                      <span className={`text-xs ${e.valid ? 'text-green-600' : 'text-red-500'}`}>
                        {e.valid ? 'valid JSON' : 'invalid JSON'}
                      </span>
                      <span className="text-xs font-medium text-indigo-600">{e.elapsedMs}ms</span>
                      <button
                        type="button"
                        onClick={() => deleteOne(e._id)}
                        className="text-xs text-red-500 hover:underline ml-auto"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </li>
              ))}
          </ul>
        )}
      </div>
    </div>
  )
}
