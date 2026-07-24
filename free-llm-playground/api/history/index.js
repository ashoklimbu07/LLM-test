import { connectDB, isDBConnected, TestResult } from '../../server/db.js'

export default async function handler(req, res) {
  await connectDB()

  if (req.method === 'GET') {
    if (!isDBConnected()) return res.status(200).json([])

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
      return res.status(200).json(results)
    } catch (err) {
      return res.status(500).json({ error: err.message })
    }
  }

  if (req.method === 'DELETE') {
    if (!isDBConnected()) return res.status(503).json({ error: 'Database not connected' })

    const { ids } = req.body ?? {}
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'ids array is required' })
    }

    try {
      const result = await TestResult.deleteMany({ _id: { $in: ids } })
      console.log(`[history] bulk deleted ${result.deletedCount} entries`)
      return res.status(200).json({ ok: true, deletedCount: result.deletedCount })
    } catch (err) {
      return res.status(500).json({ error: err.message })
    }
  }

  res.status(405).json({ error: 'Method not allowed' })
}
