import { computeTotals } from '../utils/totals'
import { formatCurrency } from '../utils/currency'

// All 4 cards: white background, colored left-border accent, colored value text.
// No mixed tinted backgrounds — consistent treatment across all cards.
const CARDS = [
  { key: 'count',  label: 'Invoices', icon: '🧾', isCount: true,
    border: '#2563EB', value: '#1E3A5F' },
  { key: 'total',  label: 'Total',    icon: '💳',
    border: '#64748B', value: '#1E293B' },
  { key: 'paid',   label: 'Paid',     icon: '✓',
    border: '#16A34A', value: '#15803D' },
  { key: 'unpaid', label: 'Unpaid',   icon: '⏳',
    border: '#D97706', value: '#B45309' },
]

export default function TotalBar({ invoices }) {
  const { count, total, paid, unpaid } = computeTotals(invoices)
  const values = { count, total, paid, unpaid }

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {CARDS.map(c => (
        <div
          key={c.key}
          className="bg-white rounded-xl border border-slate-200 p-4 flex flex-col gap-2"
          style={{
            borderLeft: `4px solid ${c.border}`,
            boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)',
          }}
        >
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              {c.label}
            </p>
            <span className="text-sm">{c.icon}</span>
          </div>
          <p className="text-[28px] font-bold tabular-nums leading-none" style={{ color: c.value }}>
            {c.isCount ? values[c.key] : formatCurrency(values[c.key])}
          </p>
        </div>
      ))}
    </div>
  )
}
