// Each provider function takes (modelId, systemPrompt, userInput, apiKey) and returns the raw text reply.
// apiKey, if provided by the caller, takes priority over the server's .env key.

async function callGemini(modelId, systemPrompt, userInput, apiKey) {
  const key = apiKey || process.env.GEMINI_API_KEY
  if (!key) throw new Error('No Gemini API key provided')

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${key}`
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: systemPrompt }] },
      contents: [{ role: 'user', parts: [{ text: userInput }] }],
      generationConfig: { responseMimeType: 'application/json' },
    }),
  })

  if (!res.ok) throw new Error(`Gemini error ${res.status}: ${await res.text()}`)
  const data = await res.json()
  return data.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
}

// Groq: free-tier, very fast inference for open models (Llama, DeepSeek-distill, etc.)
async function callGroq(modelId, systemPrompt, userInput, apiKey) {
  const key = apiKey || process.env.GROQ_API_KEY
  if (!key) throw new Error('No Groq API key provided')

  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model: modelId,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userInput },
      ],
    }),
  })

  if (!res.ok) throw new Error(`Groq error ${res.status}: ${await res.text()}`)
  const data = await res.json()
  return data.choices?.[0]?.message?.content ?? ''
}

// OpenRouter: single gateway, used here only for its free-tagged (":free") models.
async function callOpenRouter(modelId, systemPrompt, userInput, apiKey) {
  const key = apiKey || process.env.OPENROUTER_API_KEY
  if (!key) throw new Error('No OpenRouter API key provided')

  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model: modelId,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userInput },
      ],
    }),
  })

  if (!res.ok) throw new Error(`OpenRouter error ${res.status}: ${await res.text()}`)
  const data = await res.json()
  return data.choices?.[0]?.message?.content ?? ''
}

export const PROVIDERS = {
  gemini: callGemini,
  groq: callGroq,
  openrouter: callOpenRouter,
}
