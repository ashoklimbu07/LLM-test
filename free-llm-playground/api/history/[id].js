import { connectDB, isDBConnected, TestResult } from '../../server/db.js'

export default async function handler(req, res) {
  if (req.method !== 'DELETE') return res.status(405).json({ error: 'Method not allowed' })

  await connectDB()
  if (!isDBConnected()) return res.status(503).json({ error: 'Database not connected' })

  try {
    const deleted = await TestResult.findByIdAndDelete(req.query.id)
    if (!deleted) return res.status(404).json({ error: 'Not found' })
    console.log(`[history] deleted entry ${req.query.id}`)
    res.status(200).json({ ok: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}
