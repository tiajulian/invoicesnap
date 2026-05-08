export function computeTotals(invoices) {
  const sum = (key) => invoices.reduce((s, inv) => {
    const v = parseFloat(inv[key])
    return isNaN(v) ? s : s + v
  }, 0)

  return {
    count:    invoices.length,
    subtotal: sum('subtotal'),  // ex-GST; 0 when field not present
    gst:      sum('gst'),       // GST only; nulls ignored
    total:    sum('amount'),    // grand total inc-GST
  }
}
