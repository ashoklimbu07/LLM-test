import { useEffect, useState } from 'react'
import { MODEL_GROUPS, ALL_MODELS, PROVIDER_KEY_INFO } from './models'
import ResultView from './ResultView'
import HistoryView from './HistoryView'
import CompareView from './CompareView'
import SystemPromptEditor from './SystemPromptEditor'

function KeyModal({ open, onClose, keys, setKeys, savedNotice }) {
  if (!open) return null

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
      <div className="bg-white rounded-xl shadow-lg max-w-md w-full p-6 max-h-[90vh] overflow-y-auto">
        <h2 className="text-lg font-semibold mb-1">Use your own API keys</h2>
        <p className="text-sm text-gray-500 mb-4">
          Keys stay in your browser only — no billing info needed for any provider below.
        </p>

        <div className="space-y-5">
          {Object.entries(PROVIDER_KEY_INFO).map(([provider, info]) => (
            <div key={provider}>
              <label className="flex items-center justify-between text-sm font-medium text-gray-700 mb-1">
                <span>{info.name} API key</span>
                <a
                  href={info.getKeyUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-indigo-600 hover:underline"
                >
                  Get free key
                </a>
              </label>

              <ol className="text-xs text-gray-500 list-decimal list-inside mb-2 space-y-0.5">
                {info.steps.map((step) => (
                  <li key={step}>{step}</li>
                ))}
              </ol>

              <input
                type="password"
                value={keys[provider] || ''}
                onChange={(e) => setKeys({ ...keys, [provider]: e.target.value })}
                placeholder={`Paste your ${info.name} key`}
                className="w-full rounded-lg border border-gray-300 p-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
              {keys[provider] && (
                <p className="text-xs text-green-600 mt-1">✓ {info.name} key set</p>
              )}
            </div>
          ))}
        </div>

        {savedNotice && (
          <p className="text-sm text-green-600 mt-4 text-center">{savedNotice}</p>
        )}

        <button
          type="button"
          onClick={onClose}
          className="mt-4 w-full px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700"
        >
          Save & close
        </button>
      </div>
    </div>
  )
}

function TestView({ keys, setKeyModalOpen, systemPrompt, defaultSystemPrompt, setSystemPrompt }) {
  const [prompt, setPrompt] = useState('')
  const [selected, setSelected] = useState(`${ALL_MODELS[0].provider}::${ALL_MODELS[0].model}`)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')

  const [provider, model] = selected.split('::')
  const missingKey = !keys[provider]

  const handleTest = async () => {
    if (!prompt.trim()) return

    if (missingKey) {
      setError(`Missing API key for ${PROVIDER_KEY_INFO[provider].name}. Click "My API keys" above to add one.`)
      console.warn(`[llm-playground] Blocked request: no API key set for provider "${provider}"`)
      return
    }

    setLoading(true)
    setResult(null)
    setError('')

    console.log(`[llm-playground] Sending request → provider=${provider} model=${model}`)
    const startedAt = performance.now()

    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider, model, prompt, apiKey: keys[provider] || undefined, systemPrompt }),
      })
      const data = await res.json()
      const elapsedMs = Math.round(performance.now() - startedAt)
      if (!res.ok) throw new Error(data.error || 'Request failed')
      console.log(`[llm-playground] Response received ← provider=${provider} model=${model} valid=${data.valid} time=${elapsedMs}ms`)
      setResult({ ...data, elapsedMs })
    } catch (err) {
      console.error(`[llm-playground] Request failed:`, err.message)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="w-full max-w-2xl">
      <SystemPromptEditor
        value={systemPrompt}
        onChange={setSystemPrompt}
        defaultValue={defaultSystemPrompt}
      />

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">Prompt</label>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          rows={5}
          placeholder="Type your prompt here..."
          className="w-full resize-none rounded-lg border border-gray-300 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
        />

        <div className="flex flex-col sm:flex-row gap-3 mt-4">
          <select
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
            className="flex-1 rounded-lg border border-gray-300 p-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          >
            {MODEL_GROUPS.map((group) => (
              <optgroup key={group.label} label={group.label}>
                {group.models.map((m) => (
                  <option key={m.id} value={`${group.provider}::${m.id}`}>
                    {m.id} (~{m.rpd}/day, {m.rpm}/min{m.note ? `, ${m.note}` : ''})
                  </option>
                ))}
              </optgroup>
            ))}
          </select>

          <button
            type="button"
            onClick={handleTest}
            disabled={loading || !prompt.trim()}
            className="px-5 py-2.5 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Testing...' : 'Test'}
          </button>
        </div>

        <p className="text-xs text-gray-400 mt-2">
          The numbers in parentheses are that model's free-tier limits: how many requests you
          can send per day, and per minute, before the provider starts rejecting calls until the
          next window. Both reset automatically (daily count at midnight, per-minute count every
          60s) and are set by each provider, not by this app — treat them as approximate, since
          providers change them without notice.
        </p>

        {missingKey && (
          <p className="text-sm text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mt-3">
            ⚠ You're missing an API key for {PROVIDER_KEY_INFO[provider].name}. Click{' '}
            <button
              type="button"
              onClick={() => setKeyModalOpen(true)}
              className="underline font-medium"
            >
              My API keys
            </button>{' '}
            above to add one before testing.
          </p>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 min-h-[160px]">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">Response</span>
          {result && (
            <span className="flex items-center gap-2 text-xs text-gray-400">
              <span>
                {result.provider} / {result.model} · {result.valid ? 'valid JSON' : 'invalid JSON'}
              </span>
              <span className="font-semibold text-indigo-700 bg-indigo-100 rounded-full px-2 py-0.5">
                ⏱ {result.elapsedMs < 1000
                  ? `${result.elapsedMs}ms`
                  : `${(result.elapsedMs / 1000).toFixed(1)}s`}
              </span>
            </span>
          )}
        </div>

        {loading && (
          <p className="text-sm text-gray-400 animate-pulse">Waiting for response...</p>
        )}

        {!loading && error && (
          <p className="text-sm text-red-500">{error}</p>
        )}

        {!loading && !error && !result && (
          <p className="text-sm text-gray-400">Response will appear here.</p>
        )}

        {!loading && result && <ResultView result={result} />}
      </div>
    </div>
  )
}

const TABS = [
  { id: 'test', label: 'Test' },
  { id: 'history', label: 'History' },
  { id: 'compare', label: 'Compare' },
]

function App() {
  const [tab, setTab] = useState('test')
  const [keyModalOpen, setKeyModalOpen] = useState(false)
  const [keys, setKeys] = useState({})
  const [savedNotice, setSavedNotice] = useState('')
  const [systemPrompt, setSystemPrompt] = useState('')
  const [defaultSystemPrompt, setDefaultSystemPrompt] = useState('')

  useEffect(() => {
    const stored = localStorage.getItem('llm-playground-keys')
    if (stored) setKeys(JSON.parse(stored))

    fetch('/api/system-prompt')
      .then((res) => res.json())
      .then((data) => {
        setDefaultSystemPrompt(data.systemPrompt)
        setSystemPrompt(data.systemPrompt)
      })
      .catch((err) => console.error('[llm-playground] Failed to load default system prompt:', err.message))
  }, [])

  const closeKeyModal = () => {
    localStorage.setItem('llm-playground-keys', JSON.stringify(keys))
    setKeyModalOpen(false)
    setSavedNotice('Keys saved')
    console.log('[llm-playground] API keys saved to local storage:', Object.keys(keys).filter((p) => keys[p]))
    setTimeout(() => setSavedNotice(''), 2000)
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 flex flex-col items-center py-10 px-4">
      <div className="w-full max-w-4xl flex items-start justify-between mb-1">
        <h1 className="text-3xl font-bold">Free LLM Playground</h1>
        <button
          type="button"
          onClick={() => setKeyModalOpen(true)}
          className="text-sm px-3 py-1.5 rounded-lg border border-gray-300 hover:bg-gray-100"
        >
          🔑 My API keys
        </button>
      </div>
      <p className="w-full max-w-4xl text-gray-500 mb-4">
        Test a prompt against free-tier models, using your own key
      </p>

      <div className="w-full max-w-4xl flex gap-2 mb-6">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              tab === t.id ? 'bg-indigo-600 text-white' : 'bg-white border border-gray-300 text-gray-600 hover:bg-gray-100'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="w-full flex justify-center">
        {tab === 'test' && (
          <TestView
            keys={keys}
            setKeyModalOpen={setKeyModalOpen}
            systemPrompt={systemPrompt}
            defaultSystemPrompt={defaultSystemPrompt}
            setSystemPrompt={setSystemPrompt}
          />
        )}
        {tab === 'history' && <HistoryView />}
        {tab === 'compare' && (
          <CompareView
            keys={keys}
            setKeyModalOpen={setKeyModalOpen}
            systemPrompt={systemPrompt}
            defaultSystemPrompt={defaultSystemPrompt}
            setSystemPrompt={setSystemPrompt}
          />
        )}
      </div>

      <KeyModal open={keyModalOpen} onClose={closeKeyModal} keys={keys} setKeys={setKeys} savedNotice={savedNotice} />
    </div>
  )
}

export default App
