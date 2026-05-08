import { useNavigate } from 'react-router-dom'
import TotalBar from '../components/TotalBar'
import InvoiceCard from '../components/InvoiceCard'
import { usePageTitle } from '../hooks/usePageTitle'

export default function Dashboard({ invoices, onToggleStatus, onExport }) {
  const navigate = useNavigate()
  usePageTitle('Dashboard') // Improvement #14
  const recent = invoices.slice(0, 5)

  // Improvement #11: detect multiple currencies for the warning
  const currencies = [...new Set(invoices.map(inv => inv.currency || 'AUD'))]
  const hasMultiCurrency = currencies.length > 1

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <div className="flex items-center gap-2">
          {/* Improvement #15: export button is more prominent */}
          {invoices.length > 0 && (
            <button
              onClick={onExport}
              className="border border-gray-200 text-gray-600 px-3 py-2 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors flex items-center gap-1.5"
            >
              ↓ Export Excel
            </button>
          )}
          <button
            onClick={() => navigate('/add')}
            className="bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors shadow-sm"
          >
            + Add Invoice
          </button>
        </div>
      </div>

      {/* Totals */}
      <TotalBar invoices={invoices} />

      {/* Improvement #11: multi-currency warning */}
      {hasMultiCurrency && (
        <div className="rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800 flex gap-2 items-start">
          <span>⚠️</span>
          <span>
            Your invoices use multiple currencies ({currencies.join(', ')}). The totals above mix all
            currencies together and may be misleading. Consider filtering by currency or keeping
            invoices in a single currency for accurate summaries.
          </span>
        </div>
      )}

      {/* Recent list / empty state */}
      {invoices.length > 0 ? (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-gray-700">Recent Invoices</h2>
            {invoices.length > 5 && (
              <button
                onClick={() => navigate('/invoices')}
                className="text-sm text-blue-600 hover:underline"
              >
                View all {invoices.length}
              </button>
            )}
          </div>
          <div className="space-y-3">
            {recent.map(inv => (
              <InvoiceCard key={inv.id} invoice={inv} onToggleStatus={onToggleStatus} />
            ))}
          </div>
        </div>
      ) : (
        /* Improvement #13: friendly empty state */
        <div className="text-center py-20 space-y-4 rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50">
          <p className="text-5xl">🧾</p>
          <div>
            <p className="text-xl font-semibold text-gray-500">No invoices yet</p>
            <p className="text-sm text-gray-400 mt-1">
              Click <strong>+ Add Invoice</strong> to snap a photo or upload an image — OCR will fill in the details for you.
            </p>
          </div>
          <button
            onClick={() => navigate('/add')}
            className="inline-block bg-blue-600 text-white px-6 py-2.5 rounded-xl font-semibold hover:bg-blue-700 transition-colors"
          >
            + Add your first invoice
          </button>
        </div>
      )}
    </div>
  )
}
