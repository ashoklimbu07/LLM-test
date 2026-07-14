import mongoose from 'mongoose'

export async function connectDB() {
  const uri = process.env.MONGODB_URI
  if (!uri) {
    console.warn('[db] MONGODB_URI not set — history/stats will not persist')
    return
  }
  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 })
    console.log('[db] Connected to MongoDB')
  } catch (err) {
    console.error(`[db] Connection failed: ${err.message} — history/stats will not persist`)
  }
}

export function isDBConnected() {
  return mongoose.connection.readyState === 1
}

const testResultSchema = new mongoose.Schema({
  provider: { type: String, required: true },
  model: { type: String, required: true },
  prompt: { type: String, required: true },
  raw: { type: String, default: '' },
  parsed: { type: mongoose.Schema.Types.Mixed, default: null },
  valid: { type: Boolean, default: false },
  elapsedMs: { type: Number, required: true },
  createdAt: { type: Date, default: Date.now },
})

export const TestResult = mongoose.model('TestResult', testResultSchema)
