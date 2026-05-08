import { computeTotals } from '../utils/totals'
import { formatCurrency } from '../utils/currency'

const CARDS = [
  { key: 'count',    label: 'Invoices',       icon: '🧾', isCount: true,
    border: '#2563EB', value: '#1E3A5F' },
  { key: 'subtotal', label: 'Subtotal (ex-GST)', icon: '📋',
    border: '#64748B', value: '#1E293B' },
  { key: 'gst',      label: 'GST',             icon: '🏦',
    border: '#7C3AED', value: '#5B21B6' },
  { key: 'total',    label: 'Total (inc-GST)', icon: '💳',
    border: '#16A34A', value: '#15803D' },
]

export default function TotalBar({ invoices }) {
  const totals = computeTotals(invoices)

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
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 leading-none">
              {c.label}
            </p>
            <span className="text-sm">{c.icon}</span>
          </div>
          <p className="text-xl sm:text-[26px] font-bold tabular-nums leading-none truncate"
            style={{ color: c.value }}>
            {c.isCount ? totals[c.key] : formatCurrency(totals[c.key])}
          </p>
        </div>
      ))}
    </div>
  )
}
