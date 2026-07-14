import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { PROVIDERS } from './providers.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const masterPrompt = JSON.parse(
  fs.readFileSync(path.join(__dirname, '..', 'task-chunking-master-prompt.json'), 'utf-8')
)

// System prompt is built from the master prompt's core fields, unchanged in content —
// only reformatted from JSON into an instruction block an LLM can follow.
const SYSTEM_PROMPT = [
  masterPrompt.role,
  '',
  'CORE PRINCIPLES:',
  ...masterPrompt.core_principles.map((p) => `- ${p}`),
  '',
  'TONE GUIDELINES:',
  ...masterPrompt.tone_guidelines.map((t) => `- ${t}`),
  '',
  'GUARDRAILS:',
  ...masterPrompt.guardrails.map((g) => `- ${g}`),
  '',
  'RESPONSE RULES:',
  ...masterPrompt.response_rules.map((r) => `- ${r}`),
  '',
  'OUTPUT JSON SCHEMA (respond with exactly one JSON object matching this schema, nothing else):',
  JSON.stringify(masterPrompt.output_schema),
  '',
  'FEW-SHOT EXAMPLES:',
  JSON.stringify(masterPrompt.few_shot_examples),
].join('\n')

const app = express()
app.use(cors())
app.use(express.json())

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

app.post('/api/generate', async (req, res) => {
  const { provider, model, prompt, apiKey } = req.body ?? {}

  if (!provider || !model || !prompt) {
    console.warn('[generate] rejected: missing provider, model, or prompt')
    return res.status(400).json({ error: 'provider, model, and prompt are required' })
  }

  const call = PROVIDERS[provider]
  if (!call) {
    console.warn(`[generate] rejected: unknown provider "${provider}"`)
    return res.status(400).json({ error: `Unknown provider: ${provider}` })
  }

  const keySource = apiKey ? 'client key' : process.env[ENV_KEY_NAME[provider]] ? 'server .env' : 'none'
  console.log(`[generate] provider=${provider} model=${model} key=${keySource}`)

  try {
    const raw = await call(model, SYSTEM_PROMPT, prompt, apiKey)
    const { parsed, valid } = extractJson(raw)
    console.log(`[generate] success provider=${provider} model=${model} validJson=${valid}`)
    res.json({ provider, model, raw, parsed, valid })
  } catch (err) {
    console.error(`[generate] failed provider=${provider} model=${model}: ${err.message}`)
    res.status(502).json({ error: err.message })
  }
})

const PORT = process.env.PORT || 3001
app.listen(PORT, () => {
  console.log(`LLM playground backend running on http://localhost:${PORT}`)
})
