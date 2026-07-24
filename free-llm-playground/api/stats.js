import { connectDB, isDBConnected, TestResult } from '../server/db.js'

export default async function handler(req, res) {
  await connectDB()
  if (!isDBConnected()) return res.status(200).json([])

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

    res.status(200).json(
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
}
