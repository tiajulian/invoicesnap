import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getOCREngine, setOCREngine } from '../utils/ocrEngine'
import { usePageTitle } from '../hooks/usePageTitle'

const ENGINES = [
  {
    id: 'tesseract',
    name: 'Tesseract (default)',
    tag: 'Free · Works offline · ~10 MB',
    description:
      'Classic open-source OCR. Runs entirely in your browser. Best for clean, flat scans. Struggles with two-column layouts and angled phone photos.',
    color: 'blue',
  },
  {
    id: 'donut',
    name: 'Donut AI',
    tag: 'Free · ~800 MB first download · No API key',
    description:
      'Microsoft + Naver document-understanding model. Unlike Tesseract, Donut reads the entire document structure — it answers questions like "What is the vendor?" directly rather than extracting raw text. Much better for real-world phone photos and complex layouts. Model downloads once and is cached permanently in your browser.',
    color: 'violet',
  },
]

export default function Settings() {
  const navigate = useNavigate()
  usePageTitle('Settings')
  const [engine, setEngine] = useState(getOCREngine)

  function handleSelect(id) {
    setEngine(id)
    setOCREngine(id)
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} aria-label="Go back" className="text-gray-400 hover:text-gray-700 text-xl">←</button>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
      </div>

      <div className="space-y-3">
        <h2 className="font-semibold text-gray-700">OCR Engine</h2>
        <p className="text-sm text-gray-500">
          Choose how InvoiceSnap reads invoice images. Both options are completely free and run in your browser — no data is sent to any server.
        </p>

        {ENGINES.map(eng => {
          const active = engine === eng.id
          const colors = {
            blue:   { ring: 'ring-blue-500',   bg: 'bg-blue-50',   dot: 'bg-blue-500',   badge: 'bg-blue-100 text-blue-700' },
            violet: { ring: 'ring-violet-500', bg: 'bg-violet-50', dot: 'bg-violet-500', badge: 'bg-violet-100 text-violet-700' },
          }
          const c = colors[eng.color]
          return (
            <button
              key={eng.id}
              onClick={() => handleSelect(eng.id)}
              className={`w-full text-left rounded-2xl border-2 p-4 transition-all ${
                active ? `${c.ring} ring-2 ${c.bg} border-transparent` : 'border-gray-200 hover:border-gray-300 bg-white'
              }`}
            >
              <div className="flex items-start gap-3">
                <span className={`mt-1 w-4 h-4 rounded-full flex-shrink-0 border-2 flex items-center justify-center ${
                  active ? `border-transparent ${c.dot}` : 'border-gray-300'
                }`}>
                  {active && <span className="w-2 h-2 rounded-full bg-white" />}
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

      {engine === 'donut' && (
        <div className="rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800 space-y-1">
          <p className="font-medium">First-use note</p>
          <p>The Donut model (~800 MB) downloads the first time you scan an invoice. This takes 1–5 minutes depending on your connection. After that it is cached and loads instantly. The download only happens once.</p>
        </div>
      )}

      <div className="rounded-xl bg-gray-50 border border-gray-200 px-4 py-3 text-xs text-gray-500">
        🔒 Both engines run entirely in your browser. Invoice images are never uploaded to any server.
      </div>
    </div>
  )
}
