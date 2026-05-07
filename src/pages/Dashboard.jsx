import { useNavigate } from 'react-router-dom'
import TotalBar from '../components/TotalBar'
import InvoiceCard from '../components/InvoiceCard'

export default function Dashboard({ invoices, onToggleStatus, onExport }) {
  const navigate = useNavigate()
  const recent = invoices.slice(0, 5)

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <button
          onClick={() => navigate('/add')}
          className="bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors shadow-sm"
        >
          + Add Invoice
        </button>
      </div>

      {/* Totals */}
      <TotalBar invoices={invoices} />

      {/* Recent list */}
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
        <div className="text-center py-20 space-y-3">
          <p className="text-5xl">🧾</p>
          <p className="text-xl font-semibold text-gray-400">No invoices yet</p>
          <p className="text-sm text-gray-400">Tap "Add Invoice" to get started</p>
        </div>
      )}

      {/* Export */}
      {invoices.length > 0 && (
        <div className="pt-2 border-t border-gray-100">
          <button
            onClick={onExport}
            className="text-sm text-gray-400 hover:text-gray-700 transition-colors"
          >
            ↓ Export all as JSON
          </button>
        </div>
      )}
    </div>
  )
}
