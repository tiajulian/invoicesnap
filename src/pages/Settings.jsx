import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getGeminiKey, setGeminiKey } from '../utils/ocrEngine'
import { usePageTitle } from '../hooks/usePageTitle'

export default function Settings() {
  const navigate = useNavigate()
  usePageTitle('Settings')

  const [key, setKey]     = useState(getGeminiKey)
  const [show, setShow]   = useState(false)
  const [saved, setSaved] = useState(false)

  const hasKey = key.trim().length > 0

  function handleSave() {
    setGeminiKey(key)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  function handleRemove() {
    setKey('')
    setGeminiKey('')
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} aria-label="Go back" className="text-gray-400 hover:text-gray-700 text-xl">←</button>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-semibold text-gray-900">Google Gemini API Key</h2>
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                hasKey ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
              }`}>
                {hasKey ? '✓ Active' : 'Required'}
              </span>
            </div>
            <p className="text-sm text-gray-500 mt-0.5">
              InvoiceSnap uses Gemini to read invoice images. Free tier: 1,500 scans/day, no credit card.
            </p>
          </div>
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">API Key</label>
          <div className="flex gap-2">
            <input
              type={show ? 'text' : 'password'}
              value={key}
              onChange={e => { setKey(e.target.value); setSaved(false) }}
              placeholder="AIza..."
              autoComplete="off"
              spellCheck={false}
              className="flex-1 border border-gray-300 rounded-xl px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
            <button
              onClick={() => setShow(s => !s)}
              className="px-3 border border-gray-300 rounded-xl text-sm text-gray-500 hover:bg-gray-50"
            >
              {show ? 'Hide' : 'Show'}
            </button>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={handleSave}
            disabled={!key.trim()}
            className="flex-1 bg-blue-600 text-white py-2 rounded-xl text-sm font-semibold hover:bg-blue-700 disabled:opacity-40 transition-colors"
          >
            {saved ? '✓ Saved' : 'Save Key'}
          </button>
          {hasKey && (
            <button
              onClick={handleRemove}
              className="px-4 border border-red-200 text-red-600 rounded-xl text-sm hover:bg-red-50"
            >
              Remove
            </button>
          )}
        </div>

        <div className="rounded-xl bg-gray-50 border border-gray-100 px-4 py-3 space-y-1 text-sm text-gray-500">
          <p className="font-medium text-gray-700">How to get a free key</p>
          <ol className="list-decimal list-inside space-y-0.5 text-xs">
            <li>Go to <span className="font-mono text-blue-500">aistudio.google.com</span></li>
            <li>Click <strong>Get API key</strong> → <strong>Create API key</strong></li>
            <li>Copy the <span className="font-mono">AIza…</span> key and paste it above</li>
          </ol>
          <p className="text-xs text-gray-400 pt-1">
            Your key is stored only in this browser's localStorage — never sent anywhere except Google's API.
          </p>
        </div>
      </div>
    </div>
  )
}
