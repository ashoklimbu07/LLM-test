import { PROVIDERS } from './providers.js'
import { SYSTEM_PROMPT } from './masterPrompt.js'
import { isDBConnected, TestResult } from './db.js'

function extractJson(raw) {
  const trimmed = raw.trim()
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i)
  const candidate = fenced ? fenced[1] : trimmed
  try {
    return { parsed: JSON.parse(candidate), valid: true }
  } catch {
    return { parsed: null, valid: false }
  }
}

const ENV_KEY_NAME = {
  gemini: 'GEMINI_API_KEY',
  groq: 'GROQ_API_KEY',
  openrouter: 'OPENROUTER_API_KEY',
}

export async function runGenerate({ provider, model, prompt, apiKey, systemPrompt } = {}) {
  if (!provider || !model || !prompt) {
    console.warn('[generate] rejected: missing provider, model, or prompt')
    return { status: 400, body: { error: 'provider, model, and prompt are required' } }
  }

  const call = PROVIDERS[provider]
  if (!call) {
    console.warn(`[generate] rejected: unknown provider "${provider}"`)
    return { status: 400, body: { error: `Unknown provider: ${provider}` } }
  }

  const keySource = apiKey ? 'client key' : process.env[ENV_KEY_NAME[provider]] ? 'server .env' : 'none'
  const isCustomPrompt = Boolean(systemPrompt?.trim()) && systemPrompt.trim() !== SYSTEM_PROMPT
  console.log(`[generate] provider=${provider} model=${model} key=${keySource} systemPrompt=${isCustomPrompt ? 'custom' : 'default master prompt'}`)

  const startedAt = Date.now()

  try {
    const raw = await call(model, systemPrompt?.trim() || SYSTEM_PROMPT, prompt, apiKey, !isCustomPrompt)
    const elapsedMs = Date.now() - startedAt
    const { parsed, valid } = extractJson(raw)
    console.log(`[generate] success provider=${provider} model=${model} validJson=${valid} time=${elapsedMs}ms`)

    if (isDBConnected()) {
      TestResult.create({ provider, model, prompt, raw, parsed, valid, elapsedMs }).catch((err) =>
        console.error('[db] failed to save test result:', err.message)
      )
    }

    return { status: 200, body: { provider, model, raw, parsed, valid, elapsedMs } }
  } catch (err) {
    console.error(`[generate] failed provider=${provider} model=${model}: ${err.message}`)
    return { status: 502, body: { error: err.message } }
  }
}
