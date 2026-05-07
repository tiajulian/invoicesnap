import { computeTotals } from '../utils/totals'
import { formatCurrency } from '../utils/currency'

export default function TotalBar({ invoices }) {
  const { count, total, paid, unpaid } = computeTotals(invoices)
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      <Card label="Invoices" value={count} isCount />
      <Card label="Total" value={total} />
      <Card label="Paid" value={paid} color="green" />
      <Card label="Unpaid" value={unpaid} color="amber" />
    </div>
  )
}

function Card({ label, value, isCount, color }) {
  const styles = {
    green: 'bg-green-50 border-green-200 text-green-800',
    amber: 'bg-amber-50 border-amber-200 text-amber-800',
  }
  return (
    <div className={`rounded-2xl border p-4 ${styles[color] ?? 'bg-white border-gray-200 text-gray-800'}`}>
      <p className="text-xs font-medium uppercase tracking-wide opacity-60 mb-1">{label}</p>
      <p className="text-2xl font-bold tabular-nums">
        {isCount ? value : formatCurrency(value)}
      </p>
    </div>
  )
}
