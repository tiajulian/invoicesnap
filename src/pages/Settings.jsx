import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { usePageTitle } from '../hooks/usePageTitle'
import { CURRENCIES } from '../utils/currency'
import { getDefaultCurrency, setSetting } from '../utils/settings'

export default function Settings({ onDeleteAll, invoiceCount }) {
  const navigate = useNavigate()
  usePageTitle('Settings')

  const [defaultCurrency, setDefaultCurrencyState] = useState(getDefaultCurrency)
  const [saved, setSaved]           = useState(false)
  const [confirming, setConfirming] = useState(false)

  const configured = Boolean(import.meta.env.VITE_OCR_PROXY_URL)

  function handleCurrencyChange(code) {
    setDefaultCurrencyState(code)
    setSetting('defaultCurrency', code)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  function handleDeleteAll() {
    onDeleteAll()
    setConfirming(false)
    navigate('/')
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
      <div className="flex items-center gap-3">
        <button type="button" onClick={() => navigate(-1)} aria-label="Go back" title="Go back"
          className="text-gray-400 hover:text-gray-700 text-xl">←</button>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Settings</h1>
      </div>

      {/* Default currency */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
        <div>
          <h2 className="font-semibold text-gray-900">Default Currency</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            Pre-selected when adding a new invoice. Detected from your browser locale, or override here.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <select
            id="defaultCurrency" name="defaultCurrency"
            value={defaultCurrency}
            onChange={e => handleCurrencyChange(e.target.value)}
            className="flex-1 border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
          >
            {CURRENCIES.map(c => (
              <option key={c.code} value={c.code}>{c.code} — {c.label}</option>
            ))}
          </select>
          {saved && <span className="text-sm text-green-600 font-medium">✓ Saved</span>}
        </div>
      </div>

      {/* OCR status */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-gray-900">OCR Engine</h2>
          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
            configured ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'
          }`}>
            {configured ? '✓ Gemini connected' : '✗ Not configured'}
          </span>
        </div>
        <p className="text-sm text-gray-500">
          Invoice scanning is powered by Google Gemini 2.5 Flash via a secure Cloudflare proxy.
          Your API key is stored in Cloudflare — it never reaches this app.
        </p>
      </div>

      {/* Privacy */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-2">
        <h2 className="font-semibold text-gray-900">Privacy</h2>
        <ul className="text-sm text-gray-500 space-y-1.5">
          <li>📸 Invoice images are sent to Google Gemini for scanning only — not stored</li>
          <li>💾 All invoice data is saved in your browser's <strong>localStorage</strong> as plain JSON</li>
          <li>🔑 The Gemini API key never reaches your browser or this app's code</li>
          <li>🌐 No account, no login, no external database</li>
        </ul>
        <p className="text-xs text-gray-400 pt-1">
          localStorage is not encrypted — anyone with physical access to this device can read your data via browser DevTools.
        </p>
      </div>

      {/* ── Danger Zone ── */}
      <div className="bg-white rounded-xl border border-red-200 p-5 space-y-4">
        <div>
          <h2 className="font-semibold text-red-600">Danger Zone</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            Destructive actions that cannot be undone.
          </p>
        </div>

        {!confirming ? (
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-800">Delete all invoices</p>
              <p className="text-xs text-gray-400">
                {invoiceCount === 0 ? 'No invoices to delete.' : `${invoiceCount} invoice${invoiceCount !== 1 ? 's' : ''} will be permanently removed.`}
              </p>
            </div>
            <button
              type="button"
              disabled={invoiceCount === 0}
              onClick={() => setConfirming(true)}
              className="px-4 py-2 rounded-lg border border-red-300 text-red-600 text-sm font-semibold hover:bg-red-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Delete All
            </button>
          </div>
        ) : (
          <div className="rounded-lg bg-red-50 border border-red-200 p-4 space-y-3">
            <div className="flex gap-2 items-start">
              <span className="text-red-500 text-lg leading-none">⚠️</span>
              <div>
                <p className="text-sm font-semibold text-red-700">Are you absolutely sure?</p>
                <p className="text-sm text-red-600 mt-0.5">
                  This will permanently delete all <strong>{invoiceCount}</strong> invoice{invoiceCount !== 1 ? 's' : ''} from your browser. There is no undo.
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleDeleteAll}
                className="flex-1 bg-red-600 text-white py-2 rounded-lg text-sm font-semibold hover:bg-red-700 transition-colors"
              >
                Yes, delete all {invoiceCount} invoice{invoiceCount !== 1 ? 's' : ''}
              </button>
              <button
                type="button"
                onClick={() => setConfirming(false)}
                className="px-4 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      <p className="text-center text-xs text-slate-400 pt-2">
        InvoiceSnap · Powered by Google Gemini · All data stored locally
      </p>
    </div>
  )
}
