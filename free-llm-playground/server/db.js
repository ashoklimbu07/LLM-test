import mongoose from 'mongoose'

// Cached across invocations so serverless functions (which may reuse a warm
// container) don't reconnect to MongoDB on every request.
let connectionPromise = null

export async function connectDB() {
  const uri = process.env.MONGODB_URI
  if (!uri) {
    console.warn('[db] MONGODB_URI not set — history/stats will not persist')
    return
  }
  if (mongoose.connection.readyState === 1) return
  if (connectionPromise) return connectionPromise

  connectionPromise = mongoose
    .connect(uri, { serverSelectionTimeoutMS: 5000 })
    .then(() => console.log('[db] Connected to MongoDB'))
    .catch((err) => {
      console.error(`[db] Connection failed: ${err.message} — history/stats will not persist`)
      connectionPromise = null
    })

  return connectionPromise
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
