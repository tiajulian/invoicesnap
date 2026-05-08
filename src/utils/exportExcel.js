import { formatDate } from './dateFormat'

// ── Palette ───────────────────────────────────────────────────────────────
const C = {
  headerBg:    'FF1E3A5F',
  headerFg:    'FFFFFFFF',
  titleBg:     'FF2563EB',
  titleFg:     'FFFFFFFF',
  summaryBg:   'FFEFF6FF',
  summaryFg:   'FF1E3A5F',
  summaryLbl:  'FF3B82F6',
  paidBg:      'FFF0FDF4',
  paidFg:      'FF166534',
  paidBadge:   'FFD1FAE5',
  unpaidBg:    'FFFEFCE8',
  unpaidFg:    'FF713F12',
  unpaidBadge: 'FFFEF3C7',
  border:      'FFE2E8F0',
  altRow:      'FFFAFAFA',
  white:       'FFFFFFFF',
}

function border(color = C.border) {
  const s = { style: 'thin', color: { argb: color } }
  return { top: s, left: s, bottom: s, right: s }
}

function fill(argb) {
  return { type: 'pattern', pattern: 'solid', fgColor: { argb } }
}

// Columns (0-based index → Excel letter)
// A=Vendor  B=Invoice#  C=Subtotal  D=GST  E=Total  F=Currency  G=DueDate  H=DateAdded  I=Status
const HEADERS = [
  'Vendor', 'Invoice #', 'Subtotal (ex-GST)', 'GST', 'Total (inc-GST)',
  'Currency', 'Due Date', 'Date Added', 'Status',
]

export async function exportToExcel(invoices) {
  const { default: ExcelJS } = await import('exceljs')
  const wb = new ExcelJS.Workbook()
  wb.creator = 'InvoiceSnap'
  wb.created = new Date()

  const ws = wb.addWorksheet('Invoices', {
    views: [{ state: 'frozen', ySplit: 9 }],
  })

  ws.columns = [
    { key: 'vendor',        width: 28 },
    { key: 'invoiceNumber', width: 16 },
    { key: 'subtotal',      width: 16 },
    { key: 'gst',           width: 12 },
    { key: 'amount',        width: 16 },
    { key: 'currency',      width: 10 },
    { key: 'dueDate',       width: 14 },
    { key: 'dateAdded',     width: 14 },
    { key: 'status',        width: 10 },
  ]

  // ── Totals ────────────────────────────────────────────────────────────────
  const fmt    = n => parseFloat(n.toFixed(2))
  const sumOf  = key => invoices.reduce((s, i) => { const v = parseFloat(i[key]); return isNaN(v) ? s : s + v }, 0)

  const subtotalSum = fmt(sumOf('subtotal'))
  const gstSum      = fmt(sumOf('gst'))       // ignores invoices with no GST
  const totalSum    = fmt(sumOf('amount'))
  const count       = invoices.length

  // ── Row 1: Title ──────────────────────────────────────────────────────────
  ws.getRow(1).height = 28
  const t = ws.getCell('A1')
  t.value     = '🧾  InvoiceSnap Export'
  t.font      = { bold: true, size: 14, color: { argb: C.titleFg } }
  t.fill      = fill(C.titleBg)
  t.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 }
  ws.mergeCells('A1:H1')
  const td = ws.getCell('I1')
  td.value     = new Date().toLocaleDateString('en-AU')
  td.font      = { size: 10, color: { argb: C.titleFg }, italic: true }
  td.fill      = fill(C.titleBg)
  td.alignment = { vertical: 'middle', horizontal: 'right' }

  ws.getRow(2).height = 6

  // ── Rows 3-7: Summary ─────────────────────────────────────────────────────
  // Layout: A=label, B=count, C=Subtotal sum, D=GST sum, E=Total sum
  const summaryRows = [
    { row: 3, isHeader: true },
    { row: 4, label: 'All Invoices', count, subtotal: subtotalSum, gst: gstSum,  total: totalSum },
    { row: 5, label: '✓ Paid',
      count:    invoices.filter(i => i.status === 'paid').length,
      subtotal: fmt(sumOf2(invoices.filter(i => i.status === 'paid'), 'subtotal')),
      gst:      fmt(sumOf2(invoices.filter(i => i.status === 'paid'), 'gst')),
      total:    fmt(sumOf2(invoices.filter(i => i.status === 'paid'), 'amount')),
      color: 'paid' },
    { row: 6, label: '⏳ Unpaid',
      count:    invoices.filter(i => i.status === 'unpaid').length,
      subtotal: fmt(sumOf2(invoices.filter(i => i.status === 'unpaid'), 'subtotal')),
      gst:      fmt(sumOf2(invoices.filter(i => i.status === 'unpaid'), 'gst')),
      total:    fmt(sumOf2(invoices.filter(i => i.status === 'unpaid'), 'amount')),
      color: 'unpaid' },
  ]

  for (const def of summaryRows) {
    const r = ws.getRow(def.row)
    r.height = def.isHeader ? 16 : 20

    // Fill all cells in summary background
    for (let c = 1; c <= 9; c++) {
      ws.getCell(def.row, c).fill = fill(C.summaryBg)
    }

    if (def.isHeader) {
      const cell = ws.getCell(`A${def.row}`)
      cell.value = 'SUMMARY'
      cell.font  = { bold: true, size: 9, color: { argb: C.summaryLbl }, italic: true }
      ws.mergeCells(`A${def.row}:I${def.row}`)
      continue
    }

    const fg = def.color === 'paid' ? C.paidFg : def.color === 'unpaid' ? C.unpaidFg : C.summaryFg

    styleCell(ws.getCell(`A${def.row}`), def.label, fg, { bold: true, indent: 1 })
    styleCell(ws.getCell(`B${def.row}`), def.count, fg, { bold: true, center: true })
    styleNumCell(ws.getCell(`C${def.row}`), def.subtotal, fg)
    styleNumCell(ws.getCell(`D${def.row}`), def.gst > 0 ? def.gst : '', fg)  // blank if no GST
    styleNumCell(ws.getCell(`E${def.row}`), def.total, fg)
  }

  ws.getRow(7).height = 6
  ws.getRow(8).height = 6

  // ── Row 9: Column headers ─────────────────────────────────────────────────
  const hdr = ws.getRow(9)
  hdr.height = 22
  HEADERS.forEach((h, i) => {
    const cell = hdr.getCell(i + 1)
    cell.value     = h
    cell.font      = { bold: true, color: { argb: C.headerFg }, size: 10 }
    cell.fill      = fill(C.headerBg)
    cell.border    = border(C.headerBg)
    cell.alignment = {
      vertical: 'middle',
      horizontal: [2, 3, 4, 8].includes(i) ? 'right' : i === 5 ? 'center' : 'left',
      indent: i === 0 ? 1 : 0,
    }
  })

  // ── Rows 10+: Data ────────────────────────────────────────────────────────
  invoices.forEach((inv, idx) => {
    const isPaid  = inv.status === 'paid'
    const isZebra = idx % 2 === 1
    const rowBg   = isPaid ? C.paidBg : isZebra ? C.altRow : C.white
    const r       = ws.getRow(10 + idx)
    r.height      = 18

    const values = [
      inv.vendor        || '',
      inv.invoiceNumber || '',
      inv.subtotal !== undefined ? parseFloat(inv.subtotal) : '',
      inv.gst      !== undefined ? parseFloat(inv.gst)      : '',  // blank when no GST
      parseFloat(inv.amount) || 0,
      inv.currency  || 'AUD',
      inv.dueDate   ? formatDate(inv.dueDate) : '',
      inv.createdAt ? new Date(inv.createdAt).toLocaleDateString('en-AU', { year: 'numeric', month: 'short', day: 'numeric' }) : '',
      isPaid ? 'Paid' : 'Unpaid',
    ]

    values.forEach((val, col) => {
      const cell      = r.getCell(col + 1)
      cell.value      = val
      cell.fill       = fill(col === 8 ? (isPaid ? C.paidBadge : C.unpaidBadge) : rowBg)
      cell.border     = border()
      cell.font       = { color: { argb: col === 8 ? (isPaid ? C.paidFg : C.unpaidFg) : 'FF374151' },
                          bold: col === 8 }
      cell.alignment  = {
        vertical: 'middle',
        horizontal: [2, 3, 4, 8].includes(col) ? 'right' : col === 5 ? 'center' : 'left',
        indent: col === 0 ? 1 : 0,
      }
      if ([2, 3, 4].includes(col) && val !== '') cell.numFmt = '#,##0.00'
    })
  })

  // Auto-filter on header row
  ws.autoFilter = { from: 'A9', to: `I${9 + invoices.length}` }

  // Download
  const buffer = await wb.xlsx.writeBuffer()
  const blob   = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  const url    = URL.createObjectURL(blob)
  const a      = document.createElement('a')
  a.href       = url
  a.download   = `invoicesnap-${new Date().toISOString().slice(0, 10)}.xlsx`
  a.click()
  URL.revokeObjectURL(url)
}

// ── Helpers ───────────────────────────────────────────────────────────────
function sumOf2(arr, key) {
  return arr.reduce((s, i) => { const v = parseFloat(i[key]); return isNaN(v) ? s : s + v }, 0)
}

function styleCell(cell, value, fgArgb, { bold = false, center = false, indent = 0 } = {}) {
  cell.value     = value
  cell.font      = { bold, color: { argb: fgArgb } }
  cell.alignment = { horizontal: center ? 'center' : 'left', indent }
}

function styleNumCell(cell, value, fgArgb) {
  cell.value     = value
  cell.font      = { bold: true, color: { argb: fgArgb } }
  cell.numFmt    = '#,##0.00'
  cell.alignment = { horizontal: 'right' }
}
