# Free LLM Playground

A playground for sending the same prompt to multiple free-tier LLMs — Google Gemini, Groq, and OpenRouter — side by side, and comparing how they respond.

## Why this exists

Different LLMs answer the same prompt differently: in accuracy, style, verbosity, and speed. This project was built to make that comparison easy and repeatable — fire one prompt at several free-tier models at once, keep a history of past runs, and see stats (latency, success rate) per model over time, all without needing a paid API key for any provider.

## Folder structure

```
LLM-test/
├── README.md
├── .env.local                     # local env vars (gitignored)
├── .vercel/                       # Vercel project link (deployment metadata)
└── free-llm-playground/           # the app itself
    ├── index.html                 # Vite entry HTML
    ├── vite.config.js             # Vite + React + Tailwind config
    ├── package.json
    ├── api/                       # Vercel serverless functions (production backend)
    │   ├── generate.js            # POST — run a prompt against a chosen model
    │   ├── system-prompt.js       # GET — fetch the master/system prompt
    │   ├── stats.js               # GET — aggregated per-model stats
    │   └── history/
    │       ├── index.js           # GET/DELETE — list or bulk-delete past runs
    │       └── [id].js            # DELETE — remove a single run
    ├── server/                    # Express backend (local dev alternative to /api)
    │   ├── index.js               # Express app + routes (mirrors /api routes)
    │   ├── generateHandler.js     # Shared logic for calling provider APIs
    │   ├── providers.js           # Gemini / Groq / OpenRouter request adapters
    │   ├── masterPrompt.js        # Default system prompt used for comparisons
    │   └── db.js                  # MongoDB connection + TestResult model
    ├── src/                       # React frontend (Vite)
    │   ├── main.jsx                # App entry point
    │   ├── App.jsx                 # Top-level layout, API key modal, model selection
    │   ├── CompareView.jsx         # Side-by-side response comparison view
    │   ├── ResultView.jsx          # Single model result display
    │   ├── HistoryView.jsx         # Past run history browser
    │   ├── SystemPromptEditor.jsx  # Edit/override the system prompt
    │   ├── models.js               # Model catalog, rate limits, provider colors/keys
    │   └── index.css               # Tailwind entry
    └── public/                    # Static assets (favicon, etc.)
```

## How it works

- The frontend (`src/`) lets you pick one or more free models across Gemini, Groq, and OpenRouter, enter a prompt (and optionally your own API keys, kept client-side only), and run it.
- The backend runs either as Express (`server/`, for local dev) or as Vercel serverless functions (`api/`, for the deployed app) — both expose the same routes: generate a response, fetch/edit the system prompt, list history, and view aggregated stats.
- Results (including latency and validity) are optionally persisted to MongoDB so you can track how each model performs over repeated runs.

## Usage

1. `cd free-llm-playground && npm install`
2. Add free-tier API keys for the providers you want to test (see in-app "Use your own API keys" modal, or `server/.env.example`).
3. `npm run start` (runs the Vite dev server + local Express API together).
4. Enter a prompt, pick models, and compare the responses.
