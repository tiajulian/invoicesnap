import { useState, useCallback } from 'react'
import { getOCREngine } from '../utils/ocrEngine'

// ── Otsu binarization preprocessing ───────────────────────────────────────
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
      for (let i = 0; i < d.length; i += 4) {
        gray[i >> 2] = (0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]) | 0
      }
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

// ── Donut DocVQA (Transformers.js) ─────────────────────────────────────────
// Cached across calls so the model loads once and stays in memory.
let _donutPipeline = null

const DONUT_QUESTIONS = [
  { key: 'vendor',        q: 'What is the name of the vendor or supplier issuing this invoice?' },
  { key: 'invoiceNumber', q: 'What is the invoice number or reference number?' },
  { key: 'amount',        q: 'What is the total amount due?' },
  { key: 'dueDate',       q: 'What is the payment due date?' },
]

async function extractWithDonut(imageDataUrl, onProgress) {
  onProgress(3)

  if (!_donutPipeline) {
    const { pipeline } = await import('@huggingface/transformers')
    _donutPipeline = await pipeline(
      'document-question-answering',
      'Xenova/donut-base-finetuned-docvqa',
      {
        progress_callback: (info) => {
          // info: { status, name, file, progress, loaded, total }
          if (info.status === 'progress' && info.total) {
            onProgress(3 + Math.round((info.loaded / info.total) * 55))
          }
        },
      },
    )
  }

  onProgress(60)

  const result = {}
  for (let i = 0; i < DONUT_QUESTIONS.length; i++) {
    const { key, q } = DONUT_QUESTIONS[i]
    onProgress(60 + Math.round(((i + 1) / DONUT_QUESTIONS.length) * 35))
    try {
      const answers = await _donutPipeline(imageDataUrl, q)
      const text = answers?.[0]?.answer?.trim()
      if (text && !['not mentioned', 'n/a', 'none', ''].includes(text.toLowerCase())) {
        if (key === 'amount') {
          const n = parseFloat(text.replace(/[^0-9.]/g, ''))
          if (!isNaN(n) && n > 0) result.amount = n
        } else if (key === 'dueDate') {
          const parsed = parseDate(text)
          if (parsed) result.dueDate = parsed
        } else {
          result[key] = text.slice(0, 80)
        }
      }
    } catch (e) {
      console.warn(`Donut question failed (${key}):`, e.message)
    }
  }

  return result
}

// ── Tesseract fallback ─────────────────────────────────────────────────────
async function extractWithTesseract(imageDataUrl, onProgress) {
  const { createWorker } = await import('tesseract.js')
  const processed = await preprocessForOCR(imageDataUrl)
  const worker = await createWorker('eng', 1, {
    logger: (m) => {
      if (m.status === 'recognizing text') onProgress(30 + Math.round(m.progress * 65))
      else if (m.status === 'loading tesseract core') onProgress(5)
      else if (m.status === 'loading language traineddata') onProgress(10)
      else if (m.status === 'initializing api') onProgress(20)
    },
  })
  const { data: { text } } = await worker.recognize(processed)
  await worker.terminate()
  return parseOCRText(text)
}

// ── Hook ───────────────────────────────────────────────────────────────────
export function useOCR() {
  const [progress, setProgress] = useState(0)
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState(null)
  const [engine, setEngine] = useState('')

  const extractData = useCallback(async (imageData) => {
    setIsProcessing(true)
    setProgress(0)
    setError(null)

    const chosenEngine = getOCREngine()
    setEngine(chosenEngine)

    try {
      if (chosenEngine === 'donut') {
        const result = await extractWithDonut(imageData, setProgress)
        setProgress(100)
        return result
      } else {
        const result = await extractWithTesseract(imageData, setProgress)
        setProgress(100)
        return result
      }
    } catch (err) {
      // If Donut fails for any reason, fall back to Tesseract silently
      if (chosenEngine === 'donut') {
        console.warn('Donut failed, falling back to Tesseract:', err.message)
        setEngine('tesseract')
        try {
          const result = await extractWithTesseract(imageData, setProgress)
          setProgress(100)
          return result
        } catch (e2) {
          setError(e2.message)
          return {}
        }
      }
      setError(err.message)
      return {}
    } finally {
      setIsProcessing(false)
    }
  }, [])

  return { extractData, progress, isProcessing, error, engine }
}

// ── Text parsing (Tesseract path) ──────────────────────────────────────────
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

  const allAmounts = []
  for (const m of text.matchAll(/(?:\$\s*)?([\d,]{1,10}\.\d{2})\b/g)) {
    const val = parseFloat(m[1].replace(/,/g, ''))
    if (!isNaN(val) && val > 0) allAmounts.push({ val, index: m.index })
  }
  if (allAmounts.length > 0) {
    // Require a colon after plain "Total" so we don't match table column headers
    // ("Total" column header has no colon; "Sub Total:" and "Total:" do).
    const totalRx = /\b(?:grand\s+total|total\s+(?:due|amount)|amount\s+due|balance\s+(?:due|forward)|invoice\s+total|total\s*:)\s*/gi
    let bestAmount
    for (const tm of text.matchAll(totalRx)) {
      // Skip if the matched keyword is preceded by "Sub" — e.g. "Sub Total:"
      const charsBefore = text.slice(Math.max(0, tm.index - 6), tm.index)
      if (/sub\s*$/i.test(charsBefore)) continue

      const keyEnd = tm.index + tm[0].length
      const nearby = allAmounts
        .filter(a => a.index >= keyEnd && a.index < keyEnd + 120)
        .sort((a, b) => a.index - b.index)
      if (nearby.length && (!bestAmount || nearby[0].val > bestAmount.val)) bestAmount = nearby[0]
    }
    // Fallback: largest amount in the document (the grand total is almost always
    // the biggest single number on an invoice)
    result.amount = bestAmount
      ? bestAmount.val
      : allAmounts.reduce((mx, a) => (a.val > mx.val ? a : mx)).val
  }

  const invPatterns = [
    /\binvoice[\s.]*(?:no\.?|num(?:ber)?|#)?[:\s#-]*([A-Z][A-Z0-9/-]{1,24})\b/i,
    /\b(INV[-]?[A-Z0-9]{2,24})\b/,
    /\b([A-Z]{2,4}[-]?\d{4,12})\b/,
    /\b(?:receipt|order|ref(?:erence)?|purchase\s+order|po)\s*(?:no\.?|#|number)[:\s#]*([A-Z0-9][-A-Z0-9]{1,20})/i,
    /(?:^|[\s:])#([A-Z0-9]{3,20})\b/im,
  ]
  for (const pat of invPatterns) {
    const m = text.match(pat)
    if (m?.[1]) { result.invoiceNumber = m[1].trim(); break }
  }

  const dueSection = text.match(/(?:due\s*(?:date|by|on)?|payment\s+due|pay(?:ment)?\s+by)[:\s]+(.{1,50})/i)
  if (dueSection) { const d = parseDate(dueSection[1]); if (d) result.dueDate = d }
  if (!result.dueDate) { const all = findAllDates(text); if (all.length) result.dueDate = all.sort().pop() }

  const fromMatch = text.match(/\bfrom\b\s*[:\s]*\n+\s*([^\n\d$@]{3,60})/i)
  if (fromMatch) { const c = fromMatch[1].trim(); if (c.length >= 3 && !/^(abn|gst|phone|tel|fax)/i.test(c)) result.vendor = c.slice(0, 80) }
  if (!result.vendor) {
    const sm = text.match(/\b(?:supplier|vendor|billed?\s+by|issued?\s+by)[:\s]+([^\n$\d@]{3,60})/i)
    if (sm) result.vendor = sm[1].trim().slice(0, 80)
  }
  if (!result.vendor) {
    const SKIP = /^(invoice|tax\s+invoice|receipt|bill(?:\s+of\s+sale)?|statement|credit\s+note|debit\s+note|page\s*\d|date|to\s*:|from\s*:|bill\s+to|ship\s+to|sold\s+to|remit\s+to|attention|attn|tel|fax|e?-?mail|www\.|http|address|suite|floor|p\.?o\.?\s*box|abn|gst)$/i
    const fb = lines.find(l => l.length >= 3 && l.length <= 80 && !SKIP.test(l) && !/^\d/.test(l) && !/\$|%/.test(l) && !/^\W+$/.test(l) && !/\d{5}/.test(l) && !/^[A-Z]{2,6}\d{4,}$/.test(l))
    if (fb) result.vendor = fb.slice(0, 80)
  }

  return result
}

function parseDate(str) {
  if (!str) return null
  str = str.trim().replace(/\s+/g, ' ')
  let m = str.match(/\b(\d{4})-(\d{2})-(\d{2})\b/)
  if (m && +m[2] <= 12 && +m[3] <= 31) return m[0]
  m = str.match(/\b(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})\b/)
  if (m) { const [, a, b, yr] = m; const [mo, dy] = +a > 12 ? [b, a] : [a, b]; if (+mo <= 12 && +dy <= 31) return `${yr}-${mo.padStart(2, '0')}-${dy.padStart(2, '0')}` }
  m = str.match(/\b(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2})\b/)
  if (m) { const [, a, b, y2] = m; const [mo, dy] = +a > 12 ? [b, a] : [a, b]; if (+mo <= 12 && +dy <= 31) return `20${y2}-${mo.padStart(2, '0')}-${dy.padStart(2, '0')}` }
  const mnRx = new RegExp(`\\b(${MONTH_NAMES})[,\\s]+(\\d{1,2})[,\\s]+(\\d{4})\\b`, 'i')
  m = str.match(mnRx)
  if (m) { const mo = MONTH_MAP[m[1].slice(0, 3).toLowerCase()]; if (mo) return `${m[3]}-${mo}-${m[2].padStart(2, '0')}` }
  const dmyRx = new RegExp(`\\b(\\d{1,2})\\s+(${MONTH_NAMES})[,\\s]+(\\d{4})\\b`, 'i')
  m = str.match(dmyRx)
  if (m) { const mo = MONTH_MAP[m[2].slice(0, 3).toLowerCase()]; if (mo && +m[1] <= 31) return `${m[3]}-${mo}-${m[1].padStart(2, '0')}` }
  return null
}

function findAllDates(text) {
  const found = new Set()
  for (const m of text.matchAll(/\b(\d{4})-(\d{2})-(\d{2})\b/g)) {
    if (+m[2] >= 1 && +m[2] <= 12 && +m[3] >= 1 && +m[3] <= 31) found.add(m[0])
  }
  for (const m of text.matchAll(/\b(\d{1,2})\/(\d{1,2})\/(\d{4})\b/g)) {
    if (+m[1] <= 12 && +m[2] <= 31) found.add(`${m[3]}-${m[1].padStart(2, '0')}-${m[2].padStart(2, '0')}`)
  }
  const mnRx = new RegExp(`\\b(${MONTH_NAMES})\\s+(\\d{1,2}),?\\s+(\\d{4})\\b`, 'gi')
  for (const m of text.matchAll(mnRx)) {
    const mo = MONTH_MAP[m[1].slice(0, 3).toLowerCase()]
    if (mo && +m[2] <= 31) found.add(`${m[3]}-${mo}-${m[2].padStart(2, '0')}`)
  }
  return [...found]
}
