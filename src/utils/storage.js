const KEY = 'invoicesnap_v1'

export function loadInvoices() {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? JSON.parse(raw) : []
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
