import { useNavigate } from 'react-router-dom'
import { usePageTitle } from '../hooks/usePageTitle'

const configured = Boolean(import.meta.env.VITE_OCR_PROXY_URL)

export default function Settings() {
  const navigate = useNavigate()
  usePageTitle('Settings')

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} aria-label="Go back" title="Go back" className="text-gray-400 hover:text-gray-700 text-xl">←</button>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-gray-900">OCR Engine</h2>
          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
            configured ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'
          }`}>
            {configured ? '✓ Gemini connected' : '✗ Not configured'}
          </span>
        </div>
        <p className="text-sm text-gray-500">
          Invoice scanning is powered by Google Gemini 2.0 Flash via a secure proxy.
          Your API key is stored server-side in Cloudflare — it never touches this app.
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-2">
        <h2 className="font-semibold text-gray-900">Privacy</h2>
        <ul className="text-sm text-gray-500 space-y-1 list-disc list-inside">
          <li>Invoice images are sent to Google Gemini for scanning only</li>
          <li>All invoice data is stored locally in your browser</li>
          <li>Nothing is stored on any external server</li>
          <li>The API key is never sent to your browser</li>
        </ul>
      </div>
    </div>
  )
}
