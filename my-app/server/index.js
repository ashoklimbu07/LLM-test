import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { PROVIDERS } from './providers.js'
import { connectDB, isDBConnected, TestResult } from './db.js'

await connectDB()

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

app.get('/api/system-prompt', (req, res) => {
  res.json({ systemPrompt: SYSTEM_PROMPT })
})

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
  const { provider, model, prompt, apiKey, systemPrompt } = req.body ?? {}

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

    res.json({ provider, model, raw, parsed, valid, elapsedMs })
  } catch (err) {
    console.error(`[generate] failed provider=${provider} model=${model}: ${err.message}`)
    res.status(502).json({ error: err.message })
  }
})

app.get('/api/history', async (req, res) => {
  if (!isDBConnected()) return res.json([])

  const { provider, model, from, to, limit } = req.query

  const filter = {}
  if (provider) filter.provider = provider
  if (model) filter.model = model
  if (from || to) {
    filter.createdAt = {}
    if (from) filter.createdAt.$gte = new Date(from)
    if (to) filter.createdAt.$lte = new Date(to)
  }

  try {
    const results = await TestResult.find(filter)
      .sort({ createdAt: -1 })
      .limit(Math.min(Number(limit) || 100, 500))
    res.json(results)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.delete('/api/history/:id', async (req, res) => {
  if (!isDBConnected()) return res.status(503).json({ error: 'Database not connected' })

  try {
    const deleted = await TestResult.findByIdAndDelete(req.params.id)
    if (!deleted) return res.status(404).json({ error: 'Not found' })
    console.log(`[history] deleted entry ${req.params.id}`)
    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.delete('/api/history', async (req, res) => {
  if (!isDBConnected()) return res.status(503).json({ error: 'Database not connected' })

  const { ids } = req.body ?? {}
  if (!Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ error: 'ids array is required' })
  }

  try {
    const result = await TestResult.deleteMany({ _id: { $in: ids } })
    console.log(`[history] bulk deleted ${result.deletedCount} entries`)
    res.json({ ok: true, deletedCount: result.deletedCount })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.get('/api/stats', async (req, res) => {
  if (!isDBConnected()) return res.json([])

  try {
    const stats = await TestResult.aggregate([
      {
        $group: {
          _id: { provider: '$provider', model: '$model' },
          avgElapsedMs: { $avg: '$elapsedMs' },
          count: { $sum: 1 },
          validCount: { $sum: { $cond: ['$valid', 1, 0] } },
        },
      },
      { $sort: { avgElapsedMs: 1 } },
    ])

    res.json(
      stats.map((s) => ({
        provider: s._id.provider,
        model: s._id.model,
        avgElapsedMs: Math.round(s.avgElapsedMs),
        count: s.count,
        validCount: s.validCount,
      }))
    )
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

const PORT = process.env.PORT || 3001
const server = app.listen(PORT, () => {
  console.log(`LLM playground backend running on http://localhost:${PORT}`)
})

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(
      `[server] Port ${PORT} is already in use — another backend instance is probably still running. ` +
      `Stop it first, or set a different PORT in server/.env.`
    )
    process.exit(1)
  }
  throw err
})
