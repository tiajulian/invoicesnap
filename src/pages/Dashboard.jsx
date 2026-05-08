import { useNavigate } from 'react-router-dom'
import TotalBar from '../components/TotalBar'
import InvoiceCard from '../components/InvoiceCard'
import { usePageTitle } from '../hooks/usePageTitle'

export default function Dashboard({ invoices, onToggleStatus, onExport }) {
  const navigate = useNavigate()
  usePageTitle('Dashboard')
  const recent = invoices.slice(0, 5)

  const currencies = [...new Set(invoices.map(inv => inv.currency || 'AUD'))]
  const hasMultiCurrency = currencies.length > 1

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Dashboard</h1>
        <div className="flex items-center gap-2">
          {invoices.length > 0 && (
            <button
              onClick={onExport}
              className="border border-slate-200 text-slate-600 px-3 py-2 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors"
            >
              ↓ Export Excel
            </button>
          )}
          <button
            onClick={() => navigate('/add')}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors"
            style={{ boxShadow: '0 1px 2px rgba(0,0,0,0.1)' }}
          >
            + Add Invoice
          </button>
        </div>
      </div>

      {/* Stat cards */}
      <TotalBar invoices={invoices} />

      {/* Multi-currency warning */}
      {hasMultiCurrency && (
        <div className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800 flex gap-2 items-start">
          <span>⚠️</span>
          <span>
            Your invoices use multiple currencies ({currencies.join(', ')}). The totals above mix all
            currencies and may be misleading.
          </span>
        </div>
      )}

      {/* Recent list / empty state */}
      {invoices.length > 0 ? (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-slate-700">Recent Invoices</h2>
            {invoices.length > 5 && (
              <button onClick={() => navigate('/invoices')} className="text-sm text-blue-600 hover:underline">
                View all {invoices.length}
              </button>
            )}
          </div>
          <div className="space-y-2">
            {recent.map(inv => (
              <InvoiceCard key={inv.id} invoice={inv} onToggleStatus={onToggleStatus} />
            ))}
          </div>
        </div>
      ) : (
        /* Empty state — no containing box, just centered content */
        <div className="text-center py-20 space-y-4">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-blue-50 flex items-center justify-center">
            <svg className="w-8 h-8 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round"
                d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
            </svg>
          </div>
          <div>
            <p className="text-lg font-semibold text-slate-700">No invoices yet</p>
            <p className="text-sm mt-1 max-w-xs mx-auto" style={{ color: '#94A3B8' }}>
              Snap a photo or upload an invoice — Gemini AI reads and fills in the details for you.
            </p>
          </div>
          <button
            onClick={() => navigate('/add')}
            className="inline-block bg-blue-600 text-white px-6 py-2.5 rounded-lg font-semibold hover:bg-blue-700 transition-colors text-sm"
          >
            + Add your first invoice
          </button>
        </div>
      )}

    </div>
  )
}
