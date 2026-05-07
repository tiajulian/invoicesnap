import { useState, useCallback } from 'react'

// ── Image preprocessing ────────────────────────────────────────────────────
// Convert to grayscale + stretch contrast before OCR so Tesseract sees
// high-contrast black-on-white text even on coloured / unevenly-lit photos.
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
      const gray = new Uint8Array(img.width * img.height)
      let lo = 255, hi = 0

      // Pass 1: luminance → grayscale, find range
      for (let i = 0; i < d.length; i += 4) {
        const g = (0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]) | 0
        gray[i >> 2] = g
        if (g < lo) lo = g
        if (g > hi) hi = g
      }

      // Pass 2: stretch to full 0-255 range and write back as greyscale
      const span = hi - lo || 1
      for (let i = 0; i < d.length; i += 4) {
        const v = (((gray[i >> 2] - lo) / span) * 255) | 0
        d[i] = d[i + 1] = d[i + 2] = v
        // d[i+3] (alpha) unchanged
      }

      ctx.putImageData(id, 0, 0)
      // PNG keeps hard pixel edges; JPEG re-blurs them
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
    // "Invoice No: INV-042" / "Invoice #2024-01"
    /\binvoice[\s.]*(?:no\.?|num(?:ber)?|#)?[:\s#-]*([A-Z0-9][-A-Z0-9/]{1,24})/i,
    // "INV-042" standalone
    /\bINV[-\s#]?([A-Z0-9]{2,20})\b/i,
    // "Bill / Receipt / Order / Ref / PO No: 12345"
    /\b(?:bill|receipt|order|ref(?:erence)?|purchase\s+order|po)\s*(?:no\.?|#|number)[:\s#]*([A-Z0-9][-A-Z0-9]{1,20})/i,
    // Just "#12345" at the start of a line or after a space
    /(?:^|[\s:])#([A-Z0-9]{3,20})\b/im,
    // Standalone number that looks like an invoice number (short alphanumeric after label)
    /\b(?:no|num|number)[.:\s]+([A-Z0-9]{3,20})\b/i,
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
  // Skip lines that are generic invoice header words, amounts, dates, or addresses
  const SKIP =
    /^(invoice|tax\s+invoice|receipt|bill(?:\s+of\s+sale)?|statement|credit\s+note|debit\s+note|page\s*\d|date|to\s*:|from\s*:|bill\s+to|ship\s+to|sold\s+to|remit\s+to|attention|attn|tel|fax|e?-?mail|www\.|http|address|suite|floor|p\.?o\.?\s*box)$/i

  const vendor = lines.find(l => {
    if (l.length < 3 || l.length > 80) return false
    if (SKIP.test(l)) return false
    if (/^\d/.test(l)) return false          // starts with digit → address / amount
    if (/\$|%/.test(l)) return false          // contains currency / percent
    if (/^\W+$/.test(l)) return false         // only punctuation
    if (/\d{5}/.test(l)) return false         // looks like a ZIP code
    return true
  })
  if (vendor) result.vendor = vendor.slice(0, 80)

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
