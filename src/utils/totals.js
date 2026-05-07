export function computeTotals(invoices) {
  const total = invoices.reduce((s, inv) => s + (parseFloat(inv.amount) || 0), 0)
  const paid = invoices
    .filter(inv => inv.status === 'paid')
    .reduce((s, inv) => s + (parseFloat(inv.amount) || 0), 0)
  const unpaid = invoices
    .filter(inv => inv.status === 'unpaid')
    .reduce((s, inv) => s + (parseFloat(inv.amount) || 0), 0)
  return { count: invoices.length, total, paid, unpaid }
}
