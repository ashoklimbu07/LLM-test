import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import { connectDB, isDBConnected, TestResult } from './db.js'
import { SYSTEM_PROMPT } from './masterPrompt.js'
import { runGenerate } from './generateHandler.js'

await connectDB()

const app = express()
app.use(cors())
app.use(express.json())

app.get('/api/system-prompt', (req, res) => {
  res.json({ systemPrompt: SYSTEM_PROMPT })
})

app.post('/api/generate', async (req, res) => {
  const { status, body } = await runGenerate(req.body ?? {})
  res.status(status).json(body)
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
