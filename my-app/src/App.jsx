import { useEffect, useState } from 'react'

// rpd = requests/day, rpm = requests/minute on that provider's free tier.
// Google does not publish a fixed public RPD table (their docs point to a
// login-only per-account dashboard); users commonly report much lower real-world
// limits than older published figures, so gemini's rpd here reflects that
// observed range rather than a doc-confirmed number. Groq's numbers are from
// its official rate-limits table (console.groq.com/docs/rate-limits, checked
// Jul 2026). OpenRouter's are from its official docs. All of these can change
// any time at the provider's discretion.
const MODEL_GROUPS = [
  {
    provider: 'gemini',
    label: 'Google Gemini (free tier, limits vary by account)',
    models: [
      { id: 'gemini-3.1-flash-lite', rpd: 500, rpm: 15 },
      { id: 'gemini-3-flash-preview', rpd: 20, rpm: 5 },
      { id: 'gemini-3.5-flash', rpd: 20, rpm: 5 },
    ],
  },
  {
    provider: 'groq',
    label: 'Groq (free, fast open models)',
    models: [
      { id: 'llama-3.3-70b-versatile', rpd: 1000, rpm: 30 },
      { id: 'openai/gpt-oss-120b', rpd: 1000, rpm: 30 },
      { id: 'qwen/qwen3-32b', rpd: 1000, rpm: 60 },
    ],
  },
  {
    provider: 'openrouter',
    // OpenRouter free (":free") models: 20 requests/minute always. Daily cap starts at
    // 50/day on a new account and rises to 1000/day permanently after a one-time $10
    // lifetime credit purchase (no need to spend it, just buy it once).
    label: 'OpenRouter (free-tagged models)',
    // Verified live against OpenRouter's /models endpoint and a real chat completion
    // call on 2026-07-14 — their ":free" catalog changes without notice, so re-check
    // periodically (models here have previously 404'd after being pulled from free tier).
    models: [
      { id: 'meta-llama/llama-3.3-70b-instruct:free', rpd: 50, rpm: 20 },
      { id: 'nvidia/nemotron-3-ultra-550b-a55b:free', rpd: 50, rpm: 20 },
      { id: 'openai/gpt-oss-20b:free', rpd: 50, rpm: 20 },
      { id: 'qwen/qwen3-next-80b-a3b-instruct:free', rpd: 50, rpm: 20 },
      // Chinese model, 295B MoE, strong reasoning/agentic benchmarks. This one is a
      // time-limited promo (free through 2026-07-21), unlike the others above which
      // have no announced end date — it may switch to paid after that.
      { id: 'tencent/hy3:free', rpd: 50, rpm: 20, note: 'free until Jul 21, 2026' },
    ],
  },
]

const ALL_MODELS = MODEL_GROUPS.flatMap((g) =>
  g.models.map((m) => ({ provider: g.provider, model: m.id, label: g.label }))
)

const PROVIDER_KEY_INFO = {
  gemini: {
    name: 'Gemini',
    getKeyUrl: 'https://aistudio.google.com/apikey',
    steps: [
      'Go to aistudio.google.com/apikey',
      'Sign in with your Google account',
      'Click "Create API key"',
      'Copy the key and paste it below',
    ],
  },
  groq: {
    name: 'Groq',
    getKeyUrl: 'https://console.groq.com/keys',
    steps: [
      'Go to console.groq.com/keys',
      'Sign up or log in',
      'Click "Create API Key"',
      'Copy the key and paste it below',
    ],
  },
  openrouter: {
    name: 'OpenRouter',
    getKeyUrl: 'https://openrouter.ai/keys',
    steps: [
      'Go to openrouter.ai/keys',
      'Sign up or log in',
      'Click "Create Key"',
      'Copy the key and paste it below',
    ],
  },
}

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

function App() {
  const [prompt, setPrompt] = useState('')
  const [selected, setSelected] = useState(`${ALL_MODELS[0].provider}::${ALL_MODELS[0].model}`)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const [keyModalOpen, setKeyModalOpen] = useState(false)
  const [keys, setKeys] = useState({})
  const [savedNotice, setSavedNotice] = useState('')

  useEffect(() => {
    const stored = localStorage.getItem('llm-playground-keys')
    if (stored) setKeys(JSON.parse(stored))
  }, [])

  const closeKeyModal = () => {
    localStorage.setItem('llm-playground-keys', JSON.stringify(keys))
    setKeyModalOpen(false)
    setSavedNotice('Keys saved')
    console.log('[llm-playground] API keys saved to local storage:', Object.keys(keys).filter((p) => keys[p]))
    setTimeout(() => setSavedNotice(''), 2000)
  }

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
        body: JSON.stringify({ provider, model, prompt, apiKey: keys[provider] || undefined }),
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
    <div className="min-h-screen bg-gray-50 text-gray-900 flex flex-col items-center py-10 px-4">
      <div className="w-full max-w-2xl">
        <div className="flex items-start justify-between mb-1">
          <h1 className="text-3xl font-bold">Free LLM Playground</h1>
          <button
            type="button"
            onClick={() => setKeyModalOpen(true)}
            className="text-sm px-3 py-1.5 rounded-lg border border-gray-300 hover:bg-gray-100"
          >
            🔑 My API keys
          </button>
        </div>
        <p className="text-gray-500 mb-6">Test a prompt against free-tier models, using your own key</p>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Prompt
          </label>
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

          {!loading && result && (
            <pre className="whitespace-pre-wrap text-sm text-gray-800 font-sans overflow-x-auto">
              {result.valid
                ? JSON.stringify(result.parsed, null, 2)
                : result.raw || '(empty response from model)'}
            </pre>
          )}
        </div>
      </div>

      <KeyModal open={keyModalOpen} onClose={closeKeyModal} keys={keys} setKeys={setKeys} />
    </div>
  )
}

export default App
