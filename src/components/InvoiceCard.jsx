import { useNavigate } from 'react-router-dom'
import StatusChip from './StatusChip'
import { formatCurrency } from '../utils/currency'
import { formatDate } from '../utils/dateFormat'

export default function InvoiceCard({ invoice, onToggleStatus }) {
  const navigate = useNavigate()
  return (
    <div
      onClick={() => navigate(`/invoice/${invoice.id}`)}
      className="bg-white rounded-2xl border border-gray-200 p-4 flex items-center gap-4 hover:shadow-md transition-shadow cursor-pointer"
    >
      {/* Thumbnail */}
      {invoice.image ? (
        <img
          src={invoice.image}
          alt="invoice thumbnail"
          className="w-14 h-14 rounded-xl object-cover flex-shrink-0 border border-gray-100"
        />
      ) : (
        <div className="w-14 h-14 rounded-xl bg-gray-100 flex items-center justify-center text-2xl flex-shrink-0">
          🧾
        </div>
      )}

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-gray-900 truncate">{invoice.vendor || 'Unknown Vendor'}</p>
        <p className="text-sm text-gray-500 truncate">
          {invoice.invoiceNumber ? `#${invoice.invoiceNumber}` : 'No invoice number'}
        </p>
        {/* Bug #4: format due date consistently */}
        {invoice.dueDate && (
          <p className="text-xs text-gray-400 mt-0.5">Due {formatDate(invoice.dueDate)}</p>
        )}
      </div>

      {/* Amount + status — Improvement #16: group hint on hover */}
      <div className="flex flex-col items-end gap-1.5 flex-shrink-0 group">
        <span className="font-bold text-gray-900 tabular-nums">
          {formatCurrency(invoice.amount, invoice.currency)}
        </span>
        <span onClick={e => { e.stopPropagation(); onToggleStatus(invoice.id) }}>
          <StatusChip status={invoice.status} />
        </span>
      </div>
    </div>
  )
}
