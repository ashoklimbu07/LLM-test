import { useState } from 'react'
import { MODEL_GROUPS, PROVIDER_KEY_INFO } from './models'
import ResultView from './ResultView'
import SystemPromptEditor from './SystemPromptEditor'

export default function CompareView({ keys, setKeyModalOpen, systemPrompt, defaultSystemPrompt, setSystemPrompt }) {
  const [prompt, setPrompt] = useState('')
  const [selectedKeys, setSelectedKeys] = useState(new Set())
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState([])

  const toggle = (provider, modelId) => {
    const key = `${provider}::${modelId}`
    const next = new Set(selectedKeys)
    if (next.has(key)) next.delete(key)
    else next.add(key)
    setSelectedKeys(next)
  }

  const missingKeys = [...selectedKeys]
    .map((k) => k.split('::')[0])
    .filter((provider, i, arr) => arr.indexOf(provider) === i)
    .filter((provider) => !keys[provider])

  const handleCompare = async () => {
    if (!prompt.trim() || selectedKeys.size === 0 || missingKeys.length > 0) return

    setLoading(true)
    setResults([])

    const targets = [...selectedKeys].map((k) => {
      const [provider, model] = k.split('::')
      return { provider, model }
    })

    const runs = await Promise.all(
      targets.map(async ({ provider, model }) => {
        const startedAt = performance.now()
        try {
          const res = await fetch('/api/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ provider, model, prompt, apiKey: keys[provider] || undefined, systemPrompt }),
          })
          const data = await res.json()
          const elapsedMs = Math.round(performance.now() - startedAt)
          if (!res.ok) return { provider, model, error: data.error, elapsedMs }
          return { ...data, elapsedMs }
        } catch (err) {
          return { provider, model, error: err.message, elapsedMs: Math.round(performance.now() - startedAt) }
        }
      })
    )

    setResults(runs)
    setLoading(false)
  }

  return (
    <div className="w-full max-w-4xl space-y-6">
      <SystemPromptEditor
        value={systemPrompt}
        onChange={setSystemPrompt}
        defaultValue={defaultSystemPrompt}
      />

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
        <label className="block text-sm font-medium text-gray-700 mb-2">Prompt</label>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          rows={4}
          placeholder="Type the prompt to run against every selected model..."
          className="w-full resize-none rounded-lg border border-gray-300 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
        />

        <p className="text-sm font-medium text-gray-700 mt-4 mb-2">Select models to compare</p>
        <div className="grid sm:grid-cols-2 gap-3">
          {MODEL_GROUPS.map((group) => (
            <div key={group.label}>
              <p className="text-xs font-medium text-gray-400 mb-1">{group.label}</p>
              <div className="space-y-1">
                {group.models.map((m) => (
                  <label key={m.id} className="flex items-center gap-2 text-sm text-gray-700">
                    <input
                      type="checkbox"
                      checked={selectedKeys.has(`${group.provider}::${m.id}`)}
                      onChange={() => toggle(group.provider, m.id)}
                    />
                    {m.id}
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>

        {missingKeys.length > 0 && (
          <p className="text-sm text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mt-4">
            ⚠ Missing API key for: {missingKeys.map((p) => PROVIDER_KEY_INFO[p].name).join(', ')}. Click{' '}
            <button type="button" onClick={() => setKeyModalOpen(true)} className="underline font-medium">
              My API keys
            </button>{' '}
            to add it.
          </p>
        )}

        <button
          type="button"
          onClick={handleCompare}
          disabled={loading || !prompt.trim() || selectedKeys.size === 0 || missingKeys.length > 0}
          className="mt-4 px-5 py-2.5 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? 'Comparing...' : `Compare ${selectedKeys.size || ''} model(s)`}
        </button>
      </div>

      {results.length > 0 && (
        <div className="grid sm:grid-cols-2 gap-4">
          {results.map((r, i) => (
            <div key={i} className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-gray-600 truncate">
                  {r.provider} / {r.model}
                </span>
                <span className="text-xs font-semibold text-indigo-700 bg-indigo-100 rounded-full px-2 py-0.5 shrink-0">
                  ⏱ {r.elapsedMs < 1000 ? `${r.elapsedMs}ms` : `${(r.elapsedMs / 1000).toFixed(1)}s`}
                </span>
              </div>
              {r.error ? (
                <p className="text-sm text-red-500">{r.error}</p>
              ) : (
                <ResultView result={r} />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
