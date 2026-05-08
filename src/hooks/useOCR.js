import { useState, useCallback } from 'react'

const PROXY_URL = import.meta.env.VITE_OCR_PROXY_URL || ''

async function extractWithGemini(imageDataUrl, onProgress) {
  if (!PROXY_URL) throw new Error('OCR proxy not configured')

  onProgress(10)

  const match = imageDataUrl.match(/^data:([^;]+);base64,(.+)$/)
  if (!match) throw new Error('Invalid image data')
  const [, mimeType, b64] = match

  const res = await fetch(PROXY_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{
        parts: [
          { inline_data: { mime_type: mimeType, data: b64 } },
          {
            text: `You are extracting structured data from an invoice image. Return ONLY valid JSON — no markdown fences, no explanation, nothing else.

Required JSON shape (use only the fields you can read clearly):
{
  "vendor": "<company name of the SELLER / SUPPLIER — not the customer or bill-to>",
  "invoiceNumber": "<invoice or reference number as a string>",
  "subtotal": <number>,
  "gst": <number>,
  "amount": <number>,
  "dueDate": "<YYYY-MM-DD>",
  "currency": "<3-letter ISO code — e.g. AUD, USD, EUR, GBP>"
}

HOW TO FIND subtotal AND gst:

CASE 1 — Invoice has a separate tax line (GST / VAT / Tax):
  Look for any of these labels near a dollar amount:
    GST, *GST, G.S.T., GST 10%, Tax, VAT, Sales Tax
  The asterisk (*) before GST is very common on Australian invoices — treat "*GST $1.93" as gst = 1.93.
  Set:
    subtotal = the amount BEFORE tax (often labelled Sub Total, Subtotal, Net, Net Amount, Ex GST)
    gst      = the tax line amount ONLY
    amount   = the final grand total INCLUDING tax

CASE 2 — Invoice has NO separate tax line:
  Set:
    subtotal = same number as amount
    amount   = the grand total
    *** omit gst entirely — do NOT include it ***

CRITICAL RULES:
- Never guess or invent a GST amount
- If you see a line that says "*GST" or "GST" with a dollar value next to it, that IS the gst field
- amount must always be the largest / final total on the invoice
- Omit any field you cannot read with confidence`,
          },
        ],
      }],
      generationConfig: { temperature: 0, maxOutputTokens: 1024 },
    }),
  })

  onProgress(80)

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error?.message || `Gemini error ${res.status}`)
  }

  const data = await res.json()

  // 2.5-flash is a thinking model — parts may include thought parts and answer parts
  const parts = data.candidates?.[0]?.content?.parts ?? []
  const raw = parts.filter(p => !p.thought).map(p => p.text).join('') || '{}'
  const jsonStr = raw.match(/\{[\s\S]*\}/)?.[0] ?? '{}'

  // Debug — visible in browser DevTools > Console
  console.log('[InvoiceSnap OCR] Raw Gemini text:', raw)
  console.log('[InvoiceSnap OCR] Extracted JSON string:', jsonStr)

  const parsed = JSON.parse(jsonStr)
  console.log('[InvoiceSnap OCR] Parsed fields:', parsed)

  for (const key of ['amount', 'subtotal', 'gst']) {
    if (parsed[key] !== undefined) {
      const n = parseFloat(parsed[key])
      parsed[key] = isNaN(n) ? undefined : Math.max(0, n)
    }
  }

  return parsed
}

export function useOCR() {
  const [progress, setProgress] = useState(0)
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState(null)

  const extractData = useCallback(async (imageData) => {
    setIsProcessing(true)
    setProgress(0)
    setError(null)

    try {
      const result = await extractWithGemini(imageData, setProgress)
      setProgress(100)
      return result
    } catch (err) {
      setError(err.message)
      return {}
    } finally {
      setIsProcessing(false)
    }
  }, [])

  return { extractData, progress, isProcessing, error }
}
