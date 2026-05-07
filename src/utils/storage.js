const KEY = 'invoicesnap_v1'

export function loadInvoices() {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return []
    const invoices = JSON.parse(raw)
    // Bug #5 migration: coerce amount to float for any data saved before this fix
    return invoices.map(inv => ({
      ...inv,
      amount: Math.max(0, parseFloat(inv.amount) || 0),
    }))
  } catch {
    return []
  }
}

export function saveInvoices(invoices) {
  try {
    localStorage.setItem(KEY, JSON.stringify(invoices))
  } catch (e) {
    // localStorage quota exceeded — storage is best-effort
    console.warn('Could not save to localStorage:', e)
  }
}
