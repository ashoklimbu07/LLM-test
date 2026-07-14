import { SYSTEM_PROMPT } from '../server/masterPrompt.js'

export default function handler(req, res) {
  res.status(200).json({ systemPrompt: SYSTEM_PROMPT })
}
