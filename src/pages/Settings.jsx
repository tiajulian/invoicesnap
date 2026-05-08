import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getOCREngine, setOCREngine, getGeminiKey, setGeminiKey } from '../utils/ocrEngine'
import { usePageTitle } from '../hooks/usePageTitle'

const ENGINES = [
  {
    id: 'tesseract',
    name: 'Tesseract',
    tag: 'Free · offline · ~10 MB',
    description: 'Runs entirely in your browser. Good for clean flat scans; struggles with angled phone photos and multi-column layouts.',
    color: 'blue',
  },
  {
    id: 'donut',
    name: 'Donut AI',
    tag: 'Free · offline · ~800 MB first download',
    description: 'Document-understanding model that reads invoice structure directly. Much better for phone photos. Requires a one-time 800 MB download cached in your browser.',
    color: 'violet',
  },
]

export default function Settings() {
  const navigate = useNavigate()
  usePageTitle('Settings')

  const [engine, setEngine]       = useState(getOCREngine)
  const [geminiKey, setGeminiKeyState] = useState(getGeminiKey)
  const [showKey, setShowKey]     = useState(false)
  const [saved, setSaved]         = useState(false)

  const hasGeminiKey = geminiKey.trim().length > 0
  const activeEngine = hasGeminiKey ? 'gemini' : engine

  function handleEngineSelect(id) {
    setEngine(id)
    setOCREngine(id)
  }

  function handleSaveGemini() {
    setGeminiKey(geminiKey)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  function handleRemoveGemini() {
    setGeminiKeyState('')
    setGeminiKey('')
    setSaved(false)
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} aria-label="Go back" className="text-gray-400 hover:text-gray-700 text-xl">←</button>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
      </div>

      {/* ── Gemini section ── */}
      <div className="bg-white rounded-2xl border-2 border-blue-200 p-5 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-semibold text-gray-900">Google Gemini</h2>
              <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-green-100 text-green-700">
                Recommended · Free tier
              </span>
            </div>
            <p className="text-sm text-gray-500 mt-0.5">
              Best accuracy for phone photos and complex layouts. Google AI Studio gives
              1,500 free scans/day — no credit card required.
            </p>
          </div>
          <span className={`flex-shrink-0 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
            hasGeminiKey ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400'
          }`}>
            {hasGeminiKey ? '✓ Active' : 'Off'}
          </span>
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">API Key</label>
          <div className="flex gap-2">
            <input
              type={showKey ? 'text' : 'password'}
              value={geminiKey}
              onChange={e => { setGeminiKeyState(e.target.value); setSaved(false) }}
              placeholder="AIza..."
              autoComplete="off"
              spellCheck={false}
              className="flex-1 border border-gray-300 rounded-xl px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
            <button
              onClick={() => setShowKey(s => !s)}
              className="px-3 border border-gray-300 rounded-xl text-gray-500 hover:bg-gray-50 text-sm"
            >
              {showKey ? 'Hide' : 'Show'}
            </button>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={handleSaveGemini}
            disabled={!geminiKey.trim()}
            className="flex-1 bg-blue-600 text-white py-2 rounded-xl text-sm font-semibold hover:bg-blue-700 disabled:opacity-40 transition-colors"
          >
            {saved ? '✓ Saved' : 'Save Key'}
          </button>
          {hasGeminiKey && (
            <button
              onClick={handleRemoveGemini}
              className="px-4 border border-red-200 text-red-600 rounded-xl text-sm hover:bg-red-50"
            >
              Remove
            </button>
          )}
        </div>

        <p className="text-xs text-gray-400">
          Get a free key at{' '}
          <span className="font-mono text-blue-500">aistudio.google.com</span>
          {' '}→ Get API key. Your key is stored only in this browser.
        </p>
      </div>

      {/* ── Local engine fallback ── */}
      <div className="space-y-3">
        <div>
          <h2 className="font-semibold text-gray-700">Fallback engine</h2>
          <p className="text-sm text-gray-400">
            Used when no Gemini key is set. Both run entirely in your browser.
          </p>
        </div>

        {ENGINES.map(eng => {
          const isActive = !hasGeminiKey && engine === eng.id
          const colors = {
            blue:   { ring: 'ring-blue-400',   bg: 'bg-blue-50',   dot: 'bg-blue-500',   badge: 'bg-blue-100 text-blue-700' },
            violet: { ring: 'ring-violet-400', bg: 'bg-violet-50', dot: 'bg-violet-500', badge: 'bg-violet-100 text-violet-700' },
          }
          const c = colors[eng.color]
          return (
            <button
              key={eng.id}
              onClick={() => handleEngineSelect(eng.id)}
              className={`w-full text-left rounded-2xl border-2 p-4 transition-all ${
                isActive ? `ring-2 ${c.ring} ${c.bg} border-transparent` : 'border-gray-200 hover:border-gray-300 bg-white'
              } ${hasGeminiKey ? 'opacity-50' : ''}`}
            >
              <div className="flex items-start gap-3">
                <span className={`mt-1 w-4 h-4 rounded-full flex-shrink-0 border-2 flex items-center justify-center ${
                  isActive ? `border-transparent ${c.dot}` : 'border-gray-300'
                }`}>
                  {isActive && <span className="w-2 h-2 rounded-full bg-white" />}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-gray-900">{eng.name}</span>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${c.badge}`}>{eng.tag}</span>
                  </div>
                  <p className="text-sm text-gray-500 mt-1">{eng.description}</p>
                </div>
              </div>
            </button>
          )
        })}
      </div>

      {engine === 'donut' && !hasGeminiKey && (
        <div className="rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800">
          <p className="font-medium">First-use note</p>
          <p>The Donut model (~800 MB) downloads on first scan and is then cached permanently. Takes 1–5 minutes on first use.</p>
        </div>
      )}

      <div className="rounded-xl bg-gray-50 border border-gray-200 px-4 py-3 text-xs text-gray-500">
        {hasGeminiKey
          ? '🌐 Gemini is active — invoice images are sent to Google\'s API for processing.'
          : '🔒 No API key set — invoice images never leave your device.'}
      </div>
    </div>
  )
}
