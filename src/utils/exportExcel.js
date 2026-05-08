import * as XLSX from 'xlsx'
import { formatDate } from './dateFormat'

export function exportToExcel(invoices) {
  const wb = XLSX.utils.book_new()

  // ── Compute summary totals ───────────────────────────────────────────────
  const total   = invoices.reduce((s, inv) => s + (parseFloat(inv.amount) || 0), 0)
  const paid    = invoices.filter(inv => inv.status === 'paid').reduce((s, inv) => s + (parseFloat(inv.amount) || 0), 0)
  const unpaid  = invoices.filter(inv => inv.status === 'unpaid').reduce((s, inv) => s + (parseFloat(inv.amount) || 0), 0)
  const paidCount   = invoices.filter(inv => inv.status === 'paid').length
  const unpaidCount = invoices.filter(inv => inv.status === 'unpaid').length

  const fmt = n => parseFloat(n.toFixed(2))

  // ── Sheet data ────────────────────────────────────────────────────────────
  // Row 1: title
  // Rows 2-7: summary
  // Row 8: blank
  // Row 9: headers (auto-filter starts here)
  // Rows 10+: invoice data

  const HEADER_ROW = 9 // 1-based

  const invoiceRows = invoices.map(inv => [
    inv.vendor        || '',
    inv.invoiceNumber || '',
    fmt(parseFloat(inv.amount) || 0),
    inv.currency      || 'AUD',
    inv.dueDate ? formatDate(inv.dueDate) : '',
    inv.createdAt
      ? new Date(inv.createdAt).toLocaleDateString('en-AU', { year: 'numeric', month: 'short', day: 'numeric' })
      : '',
    inv.status === 'paid' ? 'Paid' : 'Unpaid',
  ])

  const sheetData = [
    /* 1 */ ['InvoiceSnap Export', '', '', '', '', '', new Date().toLocaleDateString('en-AU')],
    /* 2 */ [],
    /* 3 */ ['Summary',         '',       'Count', '', 'Amount'],
    /* 4 */ ['Total Invoices',  '',       invoices.length, '', fmt(total)],
    /* 5 */ ['Paid',            '',       paidCount,       '', fmt(paid)],
    /* 6 */ ['Unpaid',          '',       unpaidCount,     '', fmt(unpaid)],
    /* 7 */ [],
    /* 8 */ [],
    /* 9 */ ['Vendor', 'Invoice #', 'Amount', 'Currency', 'Due Date', 'Date Added', 'Status'],
    ...invoiceRows,
  ]

  const ws = XLSX.utils.aoa_to_sheet(sheetData)

  // ── Auto-filter on the header row ─────────────────────────────────────────
  const lastDataRow = HEADER_ROW + invoiceRows.length
  ws['!autofilter'] = { ref: `A${HEADER_ROW}:G${lastDataRow}` }

  // ── Column widths ─────────────────────────────────────────────────────────
  ws['!cols'] = [
    { wch: 28 }, // Vendor
    { wch: 16 }, // Invoice #
    { wch: 12 }, // Amount
    { wch: 10 }, // Currency
    { wch: 14 }, // Due Date
    { wch: 14 }, // Date Added
    { wch: 10 }, // Status
  ]

  XLSX.utils.book_append_sheet(wb, ws, 'Invoices')
  XLSX.writeFile(wb, `invoicesnap-${new Date().toISOString().slice(0, 10)}.xlsx`)
}
