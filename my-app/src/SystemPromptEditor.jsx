import { useState } from 'react'

// Lets the user override the master/system prompt sent with every request.
// Defaults to the built-in task-chunking master prompt (fetched from the backend),
// but any text can be pasted in its place — the output viewer already falls back
// to plain JSON/text when a response doesn't match the built-in schema, so a
// different master prompt just renders as plain output instead of the pretty view.
export default function SystemPromptEditor({ value, onChange, defaultValue }) {
  const [open, setOpen] = useState(false)
  const isCustom = value !== defaultValue

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between text-sm font-medium text-gray-700"
      >
        <span>
          ⚙ System / master prompt
          {isCustom && (
            <span className="ml-2 text-xs font-medium text-indigo-600 bg-indigo-50 rounded-full px-2 py-0.5">
              custom
            </span>
          )}
        </span>
        <span className="text-gray-400">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className="mt-3">
          <p className="text-xs text-gray-400 mb-2">
            This is sent as the system prompt on every request, before your typed input.
            Defaults to the task-chunking master prompt — edit or replace it with your own.
            Output that doesn't match the built-in schema still displays fine, just as plain
            text/JSON instead of the pretty task-breakdown view.
          </p>
          <textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            rows={10}
            className="w-full rounded-lg border border-gray-300 p-3 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          />
          {isCustom && (
            <button
              type="button"
              onClick={() => onChange(defaultValue)}
              className="mt-2 text-xs text-indigo-600 hover:underline"
            >
              Reset to default master prompt
            </button>
          )}
        </div>
      )}
    </div>
  )
}
