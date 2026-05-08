import { computeTotals } from '../utils/totals'
import { formatCurrency } from '../utils/currency'

const CARDS = [
  {
    key: 'count', label: 'Invoices', icon: '🧾', isCount: true,
    border: 'border-l-blue-400', iconBg: 'bg-blue-50',
    labelColor: 'text-blue-500', valueColor: 'text-blue-700',
  },
  {
    key: 'total', label: 'Total', icon: '💳',
    border: 'border-l-slate-400', iconBg: 'bg-slate-50',
    labelColor: 'text-slate-500', valueColor: 'text-slate-700',
  },
  {
    key: 'paid', label: 'Paid', icon: '✓',
    border: 'border-l-green-400', iconBg: 'bg-green-50',
    labelColor: 'text-green-600', valueColor: 'text-green-700',
  },
  {
    key: 'unpaid', label: 'Unpaid', icon: '⏳',
    border: 'border-l-amber-400', iconBg: 'bg-amber-50',
    labelColor: 'text-amber-600', valueColor: 'text-amber-700',
  },
]

export default function TotalBar({ invoices }) {
  const { count, total, paid, unpaid } = computeTotals(invoices)
  const values = { count, total, paid, unpaid }

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {CARDS.map(c => (
        <div key={c.key} className={`bg-white rounded-2xl border border-gray-100 border-l-4 ${c.border} p-4 flex flex-col gap-2 shadow-sm`}>
          <div className="flex items-center justify-between">
            <p className={`text-xs font-semibold uppercase tracking-wide ${c.labelColor}`}>{c.label}</p>
            <span className={`w-7 h-7 rounded-lg ${c.iconBg} flex items-center justify-center text-sm`}>{c.icon}</span>
          </div>
          <p className={`text-2xl font-bold tabular-nums leading-none ${c.valueColor}`}>
            {c.isCount ? values[c.key] : formatCurrency(values[c.key])}
          </p>
        </div>
      ))}
    </div>
  )
}
