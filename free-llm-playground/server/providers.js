// Each provider function takes (modelId, systemPrompt, userInput, apiKey, forceJson) and
// returns the raw text reply. apiKey, if provided by the caller, takes priority over the
// server's .env key. forceJson should only be true for the built-in master prompt, which
// guarantees JSON output — a custom system prompt may want plain text or another format.

async function callGemini(modelId, systemPrompt, userInput, apiKey, forceJson) {
  const key = apiKey || process.env.GEMINI_API_KEY
  if (!key) throw new Error('No Gemini API key provided')

  const generationConfig = { maxOutputTokens: 8192 }
  if (forceJson) generationConfig.responseMimeType = 'application/json'

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${key}`
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: systemPrompt }] },
      contents: [{ role: 'user', parts: [{ text: userInput }] }],
      generationConfig,
    }),
  })

  if (!res.ok) throw new Error(`Gemini error ${res.status}: ${await res.text()}`)
  const data = await res.json()
  const finishReason = data.candidates?.[0]?.finishReason
  if (finishReason && finishReason !== 'STOP') {
    console.warn(`[gemini] response ended early: finishReason=${finishReason}`)
  }
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
      max_tokens: 8192,
    }),
  })

  if (!res.ok) throw new Error(`Groq error ${res.status}: ${await res.text()}`)
  const data = await res.json()
  const finishReason = data.choices?.[0]?.finish_reason
  if (finishReason && finishReason !== 'stop') {
    console.warn(`[groq] response ended early: finish_reason=${finishReason}`)
  }
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
      max_tokens: 8192,
    }),
  })

  if (!res.ok) throw new Error(`OpenRouter error ${res.status}: ${await res.text()}`)
  const data = await res.json()
  const finishReason = data.choices?.[0]?.finish_reason
  if (finishReason && finishReason !== 'stop') {
    console.warn(`[openrouter] response ended early: finish_reason=${finishReason}`)
  }
  return data.choices?.[0]?.message?.content ?? ''
}

export const PROVIDERS = {
  gemini: callGemini,
  groq: callGroq,
  openrouter: callOpenRouter,
}
