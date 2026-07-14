// rpd = requests/day, rpm = requests/minute on that provider's free tier.
// Google does not publish a fixed public RPD table (their docs point to a
// login-only per-account dashboard); users commonly report much lower real-world
// limits than older published figures, so gemini's rpd here reflects that
// observed range rather than a doc-confirmed number. Groq's numbers are from
// its official rate-limits table (console.groq.com/docs/rate-limits, checked
// Jul 2026). OpenRouter's are from its official docs. All of these can change
// any time at the provider's discretion.
export const MODEL_GROUPS = [
  {
    provider: 'gemini',
    label: 'Google Gemini (free tier, limits vary by account)',
    models: [
      { id: 'gemini-3.1-flash-lite', rpd: 500, rpm: 15 },
      { id: 'gemini-3-flash-preview', rpd: 20, rpm: 5 },
      { id: 'gemini-3.5-flash', rpd: 20, rpm: 5 },
    ],
  },
  {
    provider: 'groq',
    label: 'Groq (free, fast open models)',
    models: [
      { id: 'llama-3.3-70b-versatile', rpd: 1000, rpm: 30 },
      { id: 'openai/gpt-oss-120b', rpd: 1000, rpm: 30 },
      { id: 'qwen/qwen3-32b', rpd: 1000, rpm: 60 },
    ],
  },
  {
    provider: 'openrouter',
    // OpenRouter free (":free") models: 20 requests/minute always. Daily cap starts at
    // 50/day on a new account and rises to 1000/day permanently after a one-time $10
    // lifetime credit purchase (no need to spend it, just buy it once).
    label: 'OpenRouter (free-tagged models)',
    // Verified live against OpenRouter's /models endpoint and a real chat completion
    // call on 2026-07-14 — their ":free" catalog changes without notice, so re-check
    // periodically (models here have previously 404'd after being pulled from free tier).
    models: [
      { id: 'meta-llama/llama-3.3-70b-instruct:free', rpd: 50, rpm: 20 },
      { id: 'nvidia/nemotron-3-ultra-550b-a55b:free', rpd: 50, rpm: 20 },
      { id: 'openai/gpt-oss-20b:free', rpd: 50, rpm: 20 },
      { id: 'qwen/qwen3-next-80b-a3b-instruct:free', rpd: 50, rpm: 20 },
      // Chinese model, 295B MoE, strong reasoning/agentic benchmarks. This one is a
      // time-limited promo (free through 2026-07-21), unlike the others above which
      // have no announced end date — it may switch to paid after that.
      { id: 'tencent/hy3:free', rpd: 50, rpm: 20, note: 'free until Jul 21, 2026' },
    ],
  },
]

export const ALL_MODELS = MODEL_GROUPS.flatMap((g) =>
  g.models.map((m) => ({ provider: g.provider, model: m.id, label: g.label }))
)

export const PROVIDER_KEY_INFO = {
  gemini: {
    name: 'Gemini',
    getKeyUrl: 'https://aistudio.google.com/apikey',
    steps: [
      'Go to aistudio.google.com/apikey',
      'Sign in with your Google account',
      'Click "Create API key"',
      'Copy the key and paste it below',
    ],
  },
  groq: {
    name: 'Groq',
    getKeyUrl: 'https://console.groq.com/keys',
    steps: [
      'Go to console.groq.com/keys',
      'Sign up or log in',
      'Click "Create API Key"',
      'Copy the key and paste it below',
    ],
  },
  openrouter: {
    name: 'OpenRouter',
    getKeyUrl: 'https://openrouter.ai/keys',
    steps: [
      'Go to openrouter.ai/keys',
      'Sign up or log in',
      'Click "Create Key"',
      'Copy the key and paste it below',
    ],
  },
}

// Categorical color, assigned by provider in a fixed order (never cycled) —
// palette slots 1 (blue), 2 (aqua), 5 (violet) from the validated reference palette.
export const PROVIDER_COLOR = {
  gemini: { light: '#2a78d6', dark: '#3987e5' },
  groq: { light: '#1baf7a', dark: '#199e70' },
  openrouter: { light: '#4a3aa7', dark: '#9085e9' },
}
