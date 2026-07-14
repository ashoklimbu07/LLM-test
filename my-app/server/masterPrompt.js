import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const masterPrompt = JSON.parse(
  fs.readFileSync(path.join(__dirname, '..', 'task-chunking-master-prompt.json'), 'utf-8')
)

// System prompt is built from the master prompt's core fields, unchanged in content —
// only reformatted from JSON into an instruction block an LLM can follow.
export const SYSTEM_PROMPT = [
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
