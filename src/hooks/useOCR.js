import { useState, useCallback } from 'react'

// ── Image preprocessing ────────────────────────────────────────────────────
// Otsu binarization: converts the photo to pure black-and-white using the
// threshold that maximises variance between the text and background classes.
// This is far more robust than linear contrast stretch for phone photos with
// shadows, coloured paper, or uneven flash lighting.

function otsuThreshold(gray, size) {
  const hist = new Uint32Array(256)
  for (let i = 0; i < size; i++) hist[gray[i]]++

  let sumAll = 0
  for (let i = 0; i < 256; i++) sumAll += i * hist[i]

  let sumB = 0, wB = 0, maxVar = 0, threshold = 128
  for (let t = 0; t < 256; t++) {
    wB += hist[t]
    if (!wB) continue
    const wF = size - wB
    if (!wF) break
    sumB += t * hist[t]
    const diff = sumB / wB - (sumAll - sumB) / wF
    const v = wB * wF * diff * diff
    if (v > maxVar) { maxVar = v; threshold = t }
  }
  return threshold
}

function preprocessForOCR(dataUrl) {
  return new Promise(resolve => {
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = img.width
      canvas.height = img.height
      const ctx = canvas.getContext('2d')
      ctx.drawImage(img, 0, 0)

      const id = ctx.getImageData(0, 0, img.width, img.height)
      const d = id.data
      const size = img.width * img.height
      const gray = new Uint8Array(size)

      // Pass 1: luminance → grayscale
      for (let i = 0; i < d.length; i += 4) {
        gray[i >> 2] = (0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]) | 0
      }

      // Pass 2: Otsu threshold → pure black or white
      const t = otsuThreshold(gray, size)
      for (let i = 0; i < d.length; i += 4) {
        const v = gray[i >> 2] > t ? 255 : 0
        d[i] = d[i + 1] = d[i + 2] = v
      }

      ctx.putImageData(id, 0, 0)
      resolve(canvas.toDataURL('image/png'))
    }
    img.src = dataUrl
  })
}

// ── Hook ──────────────────────────────────────────────────────────────────
export function useOCR() {
  const [progress, setProgress] = useState(0)
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState(null)

  const extractData = useCallback(async (imageData) => {
    setIsProcessing(true)
    setProgress(0)
    setError(null)

    try {
      const { createWorker } = await import('tesseract.js')

      setProgress(3)
      const processed = await preprocessForOCR(imageData)

      const worker = await createWorker('eng', 1, {
        logger: (m) => {
          if (m.status === 'recognizing text') {
            setProgress(30 + Math.round(m.progress * 65))
          } else if (m.status === 'loading tesseract core') {
            setProgress(5)
          } else if (m.status === 'loading language traineddata') {
            setProgress(10)
          } else if (m.status === 'initializing api') {
            setProgress(20)
          }
        },
      })

      const { data: { text } } = await worker.recognize(processed)
      await worker.terminate()
      setProgress(100)
      return parseOCRText(text)
    } catch (err) {
      setError(err.message)
      return {}
    } finally {
      setIsProcessing(false)
    }
  }, [])

  return { extractData, progress, isProcessing, error }
}

// ── Text parsing ──────────────────────────────────────────────────────────
const MONTH_MAP = {
  jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
  jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12',
}
const MONTH_NAMES =
  'Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?'

function parseOCRText(rawText) {
  const text = rawText
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean)
  const result = {}

  // ── Amount ──────────────────────────────────────────────────────────────
  // Collect every currency-like number in the document
  const allAmounts = []
  for (const m of text.matchAll(/(?:\$\s*)?([\d,]{1,10}\.\d{2})\b/g)) {
    const val = parseFloat(m[1].replace(/,/g, ''))
    if (!isNaN(val) && val > 0) allAmounts.push({ val, index: m.index })
  }

  if (allAmounts.length > 0) {
    // Prefer an amount that immediately follows a "total" keyword
    const totalRx = /\b(?:grand\s+total|total\s+(?:due|amount)|amount\s+due|balance\s+(?:due|forward)|invoice\s+total|total)[:\s]*/gi
    let bestAmount
    for (const tm of text.matchAll(totalRx)) {
      const keyEnd = tm.index + tm[0].length
      const nearby = allAmounts
        .filter(a => a.index >= keyEnd && a.index < keyEnd + 120)
        .sort((a, b) => a.index - b.index)
      if (nearby.length && (!bestAmount || nearby[0].val > bestAmount.val)) {
        bestAmount = nearby[0]
      }
    }
    // Fallback: largest amount on the page (totals are almost always the biggest)
    result.amount = bestAmount
      ? bestAmount.val
      : allAmounts.reduce((mx, a) => (a.val > mx.val ? a : mx)).val
  }

  // ── Invoice number ───────────────────────────────────────────────────────
  const invPatterns = [
    // "Invoice No: OMI82664" / "Invoice Number INV1076349"
    // Require first char to be a LETTER so we don't accidentally grab a date
    /\binvoice[\s.]*(?:no\.?|num(?:ber)?|#)?[:\s#-]*([A-Z][A-Z0-9/-]{1,24})\b/i,
    // "INV1076349" or "INV-042" — capture FULL code including the INV prefix
    /\b(INV[-]?[A-Z0-9]{2,24})\b/,
    // Other prefix codes: OMI, ORD, PO, SO, REC, REF + digits/letters
    /\b([A-Z]{2,4}[-]?\d{4,12})\b/,
    // "Bill / Receipt / Order / Ref / PO No: 12345"
    /\b(?:receipt|order|ref(?:erence)?|purchase\s+order|po)\s*(?:no\.?|#|number)[:\s#]*([A-Z0-9][-A-Z0-9]{1,20})/i,
    // "#12345" on its own
    /(?:^|[\s:])#([A-Z0-9]{3,20})\b/im,
  ]
  for (const pat of invPatterns) {
    const m = text.match(pat)
    if (m?.[1]) { result.invoiceNumber = m[1].trim(); break }
  }

  // ── Due date ─────────────────────────────────────────────────────────────
  // 1. Look for an explicit "due date" label and parse what follows
  const dueLabelRx =
    /(?:due\s*(?:date|by|on)?|payment\s+due|pay(?:ment)?\s+by|due\s+in\s+\d+\s+days?)[:\s]+(.{1,50})/i
  const dueSection = text.match(dueLabelRx)
  if (dueSection) {
    const d = parseDate(dueSection[1])
    if (d) result.dueDate = d
  }

  // 2. Fallback: gather all dates and take the latest (most likely due date)
  if (!result.dueDate) {
    const all = findAllDates(text)
    if (all.length) result.dueDate = all.sort().pop()
  }

  // ── Vendor name ──────────────────────────────────────────────────────────
  // Strategy 1: explicit "FROM" section (e.g. Ordermentum-style invoices)
  // Matches "FROM" on its own line or as a label, then takes the next text line
  const fromMatch = text.match(/\bfrom\b\s*[:\s]*\n+\s*([^\n\d$@]{3,60})/i)
  if (fromMatch) {
    const c = fromMatch[1].trim()
    if (c.length >= 3 && !/^(abn|gst|phone|tel|fax)/i.test(c)) result.vendor = c.slice(0, 80)
  }

  // Strategy 2: explicit "Supplier:" / "Vendor:" / "Billed by:" label
  if (!result.vendor) {
    const supplierMatch = text.match(
      /\b(?:supplier|vendor|billed?\s+by|issued?\s+by|from)[:\s]+([^\n$\d@]{3,60})/i,
    )
    if (supplierMatch) result.vendor = supplierMatch[1].trim().slice(0, 80)
  }

  // Strategy 3: first meaningful line that isn't a header word / address / code
  if (!result.vendor) {
    const SKIP =
      /^(invoice|tax\s+invoice|receipt|bill(?:\s+of\s+sale)?|statement|credit\s+note|debit\s+note|page\s*\d|date|to\s*:|from\s*:|bill\s+to|ship\s+to|sold\s+to|remit\s+to|attention|attn|tel|fax|e?-?mail|www\.|http|address|suite|floor|p\.?o\.?\s*box|abn|gst)$/i
    const fallback = lines.find(l => {
      if (l.length < 3 || l.length > 80) return false
      if (SKIP.test(l)) return false
      if (/^\d/.test(l)) return false          // starts with digit → address / amount
      if (/\$|%/.test(l)) return false          // contains currency / percent
      if (/^\W+$/.test(l)) return false         // only punctuation
      if (/\d{5}/.test(l)) return false         // looks like a ZIP code
      if (/^[A-Z]{2,6}\d{4,}$/.test(l)) return false  // looks like a bare invoice code
      return true
    })
    if (fallback) result.vendor = fallback.slice(0, 80)
  }

  return result
}

// ── Date helpers ──────────────────────────────────────────────────────────
function parseDate(str) {
  if (!str) return null
  str = str.trim().replace(/\s+/g, ' ')

  // YYYY-MM-DD
  let m = str.match(/\b(\d{4})-(\d{2})-(\d{2})\b/)
  if (m && +m[2] <= 12 && +m[3] <= 31) return m[0]

  // MM/DD/YYYY or DD/MM/YYYY or MM-DD-YYYY
  m = str.match(/\b(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})\b/)
  if (m) {
    const [, a, b, yr] = m
    const [mo, dy] = +a > 12 ? [b, a] : [a, b]   // if a>12 it must be DD
    if (+mo <= 12 && +dy <= 31) {
      return `${yr}-${mo.padStart(2, '0')}-${dy.padStart(2, '0')}`
    }
  }

  // MM/DD/YY
  m = str.match(/\b(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2})\b/)
  if (m) {
    const [, a, b, y2] = m
    const [mo, dy] = +a > 12 ? [b, a] : [a, b]
    if (+mo <= 12 && +dy <= 31) {
      return `20${y2}-${mo.padStart(2, '0')}-${dy.padStart(2, '0')}`
    }
  }

  // "Jan 15, 2024" or "January 15 2024"
  const mnRx = new RegExp(`\\b(${MONTH_NAMES})[,\\s]+(\\d{1,2})[,\\s]+(\\d{4})\\b`, 'i')
  m = str.match(mnRx)
  if (m) {
    const mo = MONTH_MAP[m[1].slice(0, 3).toLowerCase()]
    if (mo) return `${m[3]}-${mo}-${m[2].padStart(2, '0')}`
  }

  // "15 Jan 2024"
  const dmyRx = new RegExp(`\\b(\\d{1,2})\\s+(${MONTH_NAMES})[,\\s]+(\\d{4})\\b`, 'i')
  m = str.match(dmyRx)
  if (m) {
    const mo = MONTH_MAP[m[2].slice(0, 3).toLowerCase()]
    if (mo && +m[1] <= 31) return `${m[3]}-${mo}-${m[1].padStart(2, '0')}`
  }

  return null
}

function findAllDates(text) {
  const found = new Set()

  // YYYY-MM-DD
  for (const m of text.matchAll(/\b(\d{4})-(\d{2})-(\d{2})\b/g)) {
    if (+m[2] >= 1 && +m[2] <= 12 && +m[3] >= 1 && +m[3] <= 31) found.add(m[0])
  }

  // MM/DD/YYYY
  for (const m of text.matchAll(/\b(\d{1,2})\/(\d{1,2})\/(\d{4})\b/g)) {
    if (+m[1] <= 12 && +m[2] <= 31) {
      found.add(`${m[3]}-${m[1].padStart(2, '0')}-${m[2].padStart(2, '0')}`)
    }
  }

  // Month-name dates
  const mnRx = new RegExp(
    `\\b(${MONTH_NAMES})\\s+(\\d{1,2}),?\\s+(\\d{4})\\b`, 'gi',
  )
  for (const m of text.matchAll(mnRx)) {
    const mo = MONTH_MAP[m[1].slice(0, 3).toLowerCase()]
    if (mo && +m[2] <= 31) found.add(`${m[3]}-${mo}-${m[2].padStart(2, '0')}`)
  }

  return [...found]
}
