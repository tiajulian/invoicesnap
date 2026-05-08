import { formatDate } from './dateFormat'

// ── Palette ───────────────────────────────────────────────────────────────
const C = {
  headerBg:   'FF1E3A5F', // dark navy   — column headers
  headerFg:   'FFFFFFFF', // white
  titleBg:    'FF2563EB', // blue-600    — title bar
  titleFg:    'FFFFFFFF',
  summaryBg:  'FFEFF6FF', // blue-50     — summary section
  summaryFg:  'FF1E3A5F',
  summaryLbl: 'FF3B82F6', // blue-500    — summary row labels
  paidBg:     'FFF0FDF4', // green-50
  paidFg:     'FF166534', // green-800
  paidBadge:  'FFD1FAE5', // green-100   — Status cell
  unpaidBg:   'FFFEFCE8', // yellow-50
  unpaidFg:   'FF713F12', // amber-800
  unpaidBadge:'FFFEF3C7', // amber-100
  border:     'FFE2E8F0', // slate-200
  altRow:     'FFFAFAFA', // zebra stripe
  white:      'FFFFFFFF',
  gray100:    'FFF3F4F6',
}

function border(color = C.border) {
  const s = { style: 'thin', color: { argb: color } }
  return { top: s, left: s, bottom: s, right: s }
}

function fill(argb) {
  return { type: 'pattern', pattern: 'solid', fgColor: { argb } }
}

// ── Main export ────────────────────────────────────────────────────────────
export async function exportToExcel(invoices) {
  // Lazy-load ExcelJS — only downloaded when user clicks Export
  const { default: ExcelJS } = await import('exceljs')
  const wb = new ExcelJS.Workbook()
  wb.creator = 'InvoiceSnap'
  wb.created = new Date()

  const ws = wb.addWorksheet('Invoices', {
    views: [{ state: 'frozen', ySplit: 9 }], // freeze above data rows
  })

  // ── Column widths ──────────────────────────────────────────────────────
  ws.columns = [
    { key: 'vendor',        width: 30 },
    { key: 'invoiceNumber', width: 18 },
    { key: 'amount',        width: 14 },
    { key: 'currency',      width: 11 },
    { key: 'dueDate',       width: 15 },
    { key: 'dateAdded',     width: 15 },
    { key: 'status',        width: 12 },
  ]

  // ── Row 1: Title bar ───────────────────────────────────────────────────
  const titleRow = ws.getRow(1)
  titleRow.height = 28
  const titleCell = ws.getCell('A1')
  titleCell.value = '🧾  InvoiceSnap Export'
  titleCell.font   = { bold: true, size: 14, color: { argb: C.titleFg } }
  titleCell.fill   = fill(C.titleBg)
  titleCell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 }
  ws.mergeCells('A1:F1')

  const dateCell = ws.getCell('G1')
  dateCell.value = new Date().toLocaleDateString('en-AU')
  dateCell.font  = { size: 10, color: { argb: C.titleFg }, italic: true }
  dateCell.fill  = fill(C.titleBg)
  dateCell.alignment = { vertical: 'middle', horizontal: 'right' }

  // ── Row 2: blank spacer ────────────────────────────────────────────────
  ws.getRow(2).height = 6

  // ── Rows 3-7: Summary ─────────────────────────────────────────────────
  const total   = invoices.reduce((s, i) => s + (parseFloat(i.amount) || 0), 0)
  const paid    = invoices.filter(i => i.status === 'paid').reduce((s, i) => s + (parseFloat(i.amount) || 0), 0)
  const unpaid  = invoices.filter(i => i.status === 'unpaid').reduce((s, i) => s + (parseFloat(i.amount) || 0), 0)
  const paidCnt   = invoices.filter(i => i.status === 'paid').length
  const unpaidCnt = invoices.filter(i => i.status === 'unpaid').length

  function fmt(n) { return parseFloat(n.toFixed(2)) }

  const summaryDefs = [
    { row: 3, label: 'Summary',        isHeader: true },
    { row: 4, label: 'Total Invoices', count: invoices.length, amount: fmt(total) },
    { row: 5, label: '✓ Paid',         count: paidCnt,         amount: fmt(paid),   color: 'paid' },
    { row: 6, label: '⏳ Unpaid',      count: unpaidCnt,        amount: fmt(unpaid), color: 'unpaid' },
  ]

  for (const def of summaryDefs) {
    const r = ws.getRow(def.row)
    r.height = def.isHeader ? 18 : 20

    const lbl = ws.getCell(`A${def.row}`)
    lbl.fill = fill(C.summaryBg)

    if (def.isHeader) {
      lbl.value = 'SUMMARY'
      lbl.font  = { bold: true, size: 9, color: { argb: C.summaryLbl }, italic: true }
      ws.mergeCells(`A${def.row}:G${def.row}`)
    } else {
      const labelColor = def.color === 'paid' ? C.paidFg : def.color === 'unpaid' ? C.unpaidFg : C.summaryFg
      lbl.value = def.label
      lbl.font  = { bold: true, color: { argb: labelColor } }
      lbl.alignment = { indent: 1 }

      const cnt = ws.getCell(`B${def.row}`)
      cnt.value = def.count
      cnt.font  = { bold: true, color: { argb: C.summaryFg } }
      cnt.alignment = { horizontal: 'center' }
      cnt.fill  = fill(C.summaryBg)

      const amt = ws.getCell(`E${def.row}`)
      amt.value = def.amount
      amt.numFmt = '#,##0.00'
      amt.font   = { bold: true, color: { argb: labelColor } }
      amt.alignment = { horizontal: 'right' }
      amt.fill   = fill(C.summaryBg)

      for (const col of ['C', 'D', 'F', 'G']) {
        ws.getCell(`${col}${def.row}`).fill = fill(C.summaryBg)
      }
    }
  }

  // ── Row 7: blank spacer ────────────────────────────────────────────────
  ws.getRow(7).height = 6

  // ── Row 8: blank spacer ────────────────────────────────────────────────
  ws.getRow(8).height = 6

  // ── Row 9: Column headers ──────────────────────────────────────────────
  const HEADERS = ['Vendor', 'Invoice #', 'Amount', 'Currency', 'Due Date', 'Date Added', 'Status']
  const hdr = ws.getRow(9)
  hdr.height = 22
  HEADERS.forEach((h, i) => {
    const cell = hdr.getCell(i + 1)
    cell.value = h
    cell.font  = { bold: true, color: { argb: C.headerFg }, size: 10 }
    cell.fill  = fill(C.headerBg)
    cell.border = border(C.headerBg)
    cell.alignment = {
      vertical: 'middle',
      horizontal: i === 2 || i === 6 ? 'right' : i === 3 ? 'center' : 'left',
      indent: i === 0 ? 1 : 0,
    }
  })

  // ── Rows 10+: Invoice data ─────────────────────────────────────────────
  invoices.forEach((inv, idx) => {
    const isPaid  = inv.status === 'paid'
    const rowNum  = 10 + idx
    const isZebra = idx % 2 === 1

    const rowBg = isPaid ? C.paidBg : isZebra ? C.altRow : C.white
    const rowFg = isPaid ? C.paidFg : C.unpaidFg

    const r = ws.getRow(rowNum)
    r.height = 18

    const values = [
      inv.vendor        || '',
      inv.invoiceNumber || '',
      parseFloat(inv.amount) || 0,
      inv.currency      || 'AUD',
      inv.dueDate ? formatDate(inv.dueDate) : '',
      inv.createdAt
        ? new Date(inv.createdAt).toLocaleDateString('en-AU', { year: 'numeric', month: 'short', day: 'numeric' })
        : '',
      isPaid ? 'Paid' : 'Unpaid',
    ]

    values.forEach((val, col) => {
      const cell = r.getCell(col + 1)
      cell.value  = val
      cell.fill   = fill(rowBg)
      cell.border = border()
      cell.font   = { color: { argb: col === 6 ? rowFg : 'FF374151' } }
      cell.alignment = {
        vertical: 'middle',
        horizontal: col === 2 || col === 6 ? 'right' : col === 3 ? 'center' : 'left',
        indent: col === 0 ? 1 : 0,
      }

      if (col === 2) cell.numFmt = '#,##0.00'

      // Status cell — badge style
      if (col === 6) {
        cell.fill = fill(isPaid ? C.paidBadge : C.unpaidBadge)
        cell.font = { bold: true, color: { argb: rowFg } }
        cell.alignment = { horizontal: 'center', vertical: 'middle' }
      }
    })
  })

  // ── Auto-filter on header row ──────────────────────────────────────────
  ws.autoFilter = { from: 'A9', to: `G${9 + invoices.length}` }

  // ── Download ───────────────────────────────────────────────────────────
  const buffer = await wb.xlsx.writeBuffer()
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `invoicesnap-${new Date().toISOString().slice(0, 10)}.xlsx`
  a.click()
  URL.revokeObjectURL(url)
}
