import { useState, useCallback } from 'react'
import { getGeminiKey } from '../utils/ocrEngine'

async function extractWithGemini(imageDataUrl, apiKey, onProgress) {
  onProgress(10)

  const match = imageDataUrl.match(/^data:([^;]+);base64,(.+)$/)
  if (!match) throw new Error('Invalid image data')
  const [, mimeType, b64] = match

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [
            { inline_data: { mime_type: mimeType, data: b64 } },
            {
              text: `Extract data from this invoice image. Return ONLY a JSON object — no markdown, no explanation.

{
  "vendor": "company name issuing this invoice (the supplier/seller, NOT the customer/bill-to)",
  "invoiceNumber": "invoice or reference number as a string",
  "amount": 123.45,
  "dueDate": "YYYY-MM-DD",
  "currency": "3-letter ISO code e.g. AUD USD EUR GBP"
}

Omit any field you cannot confidently determine. For amount use the final Total, not Sub Total.`,
            },
          ],
        }],
        generationConfig: { temperature: 0, maxOutputTokens: 300 },
      }),
    },
  )

  onProgress(80)

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error?.message || `Gemini API error ${res.status}`)
  }

  const data = await res.json()
  const raw = data.candidates?.[0]?.content?.parts?.[0]?.text || '{}'
  const jsonStr = raw.match(/\{[\s\S]*\}/)?.[0] ?? '{}'
  const parsed = JSON.parse(jsonStr)

  if (parsed.amount !== undefined) {
    parsed.amount = Math.max(0, parseFloat(parsed.amount) || 0)
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

    const apiKey = getGeminiKey()
    if (!apiKey) {
      setError('No Gemini API key configured. Go to Settings to add your key.')
      setIsProcessing(false)
      return {}
    }

    try {
      const result = await extractWithGemini(imageData, apiKey, setProgress)
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
