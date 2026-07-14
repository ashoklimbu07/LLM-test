import { useState } from 'react'

const MODEL_GROUPS = [
  {
    provider: 'OpenAI',
    models: ['gpt-4o', 'gpt-4o-mini', 'gpt-4.1', 'o3', 'o3-mini'],
  },
  {
    provider: 'Google Gemini',
    models: ['gemini-2.5-pro', 'gemini-2.5-flash', 'gemini-2.0-flash'],
  },
  {
    provider: 'Anthropic',
    models: ['claude-sonnet-5', 'claude-opus-4-8', 'claude-haiku-4-5'],
  },
  {
    provider: 'xAI',
    models: ['grok-4', 'grok-3', 'grok-3-mini'],
  },
  {
    provider: 'DeepSeek',
    models: ['deepseek-v3', 'deepseek-r1'],
  },
  {
    provider: 'Moonshot AI',
    models: ['kimi-k2', 'kimi-1.5'],
  },
  {
    provider: 'Meta',
    models: ['llama-4-maverick', 'llama-4-scout', 'llama-3.3-70b'],
  },
  {
    provider: 'Mistral',
    models: ['mistral-large', 'mistral-small'],
  },
]

function App() {
  const [prompt, setPrompt] = useState('')
  const [model, setModel] = useState(MODEL_GROUPS[0].models[0])
  const [loading, setLoading] = useState(false)
  const [response, setResponse] = useState('')

  const handleTest = async () => {
    if (!prompt.trim()) return
    setLoading(true)
    setResponse('')

    // TODO: replace with real backend API call, e.g.
    // const res = await fetch('/api/llm', { method: 'POST', body: JSON.stringify({ model, prompt }) })
    // const data = await res.json()
    // setResponse(data.text)
    await new Promise((resolve) => setTimeout(resolve, 900))
    setResponse(
      `[Mock response from ${model}]\n\nYou asked: "${prompt}"\n\nWire up the backend call in handleTest() to see a real reply here.`
    )
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 flex flex-col items-center py-10 px-4">
      <div className="w-full max-w-2xl">
        <h1 className="text-3xl font-bold mb-1">LLM Playground</h1>
        <p className="text-gray-500 mb-6">Test a prompt against different models</p>

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
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className="flex-1 rounded-lg border border-gray-300 p-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              {MODEL_GROUPS.map((group) => (
                <optgroup key={group.provider} label={group.provider}>
                  {group.models.map((m) => (
                    <option key={m} value={m}>
                      {m}
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
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 min-h-[160px]">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">Response</span>
            {response && (
              <span className="text-xs text-gray-400">{model}</span>
            )}
          </div>

          {loading && (
            <p className="text-sm text-gray-400 animate-pulse">Waiting for response...</p>
          )}

          {!loading && !response && (
            <p className="text-sm text-gray-400">Response will appear here.</p>
          )}

          {!loading && response && (
            <pre className="whitespace-pre-wrap text-sm text-gray-800 font-sans">
              {response}
            </pre>
          )}
        </div>
      </div>
    </div>
  )
}

export default App
