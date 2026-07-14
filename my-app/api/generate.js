import { connectDB } from '../server/db.js'
import { runGenerate } from '../server/generateHandler.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  await connectDB()
  const { status, body } = await runGenerate(req.body ?? {})
  res.status(status).json(body)
}
