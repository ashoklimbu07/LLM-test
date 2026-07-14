import { useState } from 'react'

const MODE_LABEL = {
  chunked_plan: 'Chunked plan',
  alternative_approach: 'Alternative approach',
  needs_human_support: 'Needs human support',
  outside_scope: 'Outside scope',
}

function ChunkRow({ chunk }) {
  return (
    <li className="flex items-start gap-2 py-1.5 border-b border-gray-100 last:border-0">
      <span
        className={`text-xs mt-0.5 rounded-full px-1.5 py-0.5 shrink-0 ${
          chunk.is_quick_win ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
        }`}
      >
        {chunk.order}
      </span>
      <div className="min-w-0">
        <p className="text-sm text-gray-800 line-clamp-2">{chunk.title}</p>
        <p className="text-xs text-gray-400">
          {chunk.estimate_minutes}min
          {chunk.is_quick_win ? ' · quick win' : ''}
          {chunk.deadline ? ` · due ${chunk.deadline}` : ''}
        </p>
      </div>
    </li>
  )
}

export function PrettyView({ data }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <span className="text-xs font-medium bg-indigo-100 text-indigo-700 rounded-full px-2 py-0.5">
          {MODE_LABEL[data.mode] || data.mode}
        </span>
      </div>

      {data.summary && <p className="text-sm text-gray-700">{data.summary}</p>}

      {data.chunks?.length > 0 && (
        <ul className="border border-gray-100 rounded-lg px-3">
          {data.chunks.map((c) => (
            <ChunkRow key={c.id} chunk={c} />
          ))}
        </ul>
      )}

      {data.alternative_solutions?.length > 0 && (
        <ul className="space-y-1.5">
          {data.alternative_solutions.map((a, i) => (
            <li key={i} className="text-sm text-gray-700 bg-gray-50 rounded-lg px-3 py-2">
              <span className="text-xs font-medium text-gray-400 uppercase mr-1">{a.type}</span>
              {a.description}
            </li>
          ))}
        </ul>
      )}

      {data.encouragement && (
        <p className="text-sm text-green-700 italic">{data.encouragement}</p>
      )}

      {data.clarifying_question && (
        <p className="text-sm text-amber-700">❓ {data.clarifying_question}</p>
      )}

      {data.support_note && (
        <p className="text-sm text-red-700 bg-red-50 rounded-lg px-3 py-2">{data.support_note}</p>
      )}

      {data.has_more && (
        <p className="text-xs text-gray-400">More steps exist beyond this first phase.</p>
      )}
    </div>
  )
}

// Renders the task-chunking master prompt's output_schema, with a toggle between
// the raw JSON (default) and a friendly rendered view. Falls back to raw text/JSON
// when the response isn't valid or isn't schema-shaped, regardless of toggle state.
export default function ResultView({ result }) {
  const [pretty, setPretty] = useState(false)

  const data = result.valid ? result.parsed : null
  const canRenderPretty = data && data.mode

  return (
    <div>
      {canRenderPretty && (
        <label className="flex items-center gap-2 mb-3 text-xs text-gray-500 select-none cursor-pointer w-fit">
          <span>Pretty view</span>
          <button
            type="button"
            role="switch"
            aria-checked={pretty}
            onClick={() => setPretty((p) => !p)}
            className={`relative w-9 h-5 rounded-full transition-colors ${
              pretty ? 'bg-indigo-600' : 'bg-gray-300'
            }`}
          >
            <span
              className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
                pretty ? 'translate-x-4' : ''
              }`}
            />
          </button>
        </label>
      )}

      {canRenderPretty && pretty ? (
        <PrettyView data={data} />
      ) : (
        <pre className="whitespace-pre-wrap text-sm text-gray-800 font-sans overflow-x-auto">
          {result.valid
            ? JSON.stringify(result.parsed, null, 2)
            : result.raw || '(empty response from model)'}
        </pre>
      )}
    </div>
  )
}
