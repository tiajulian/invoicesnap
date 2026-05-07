import { useState, useCallback } from 'react'

export function useOCR() {
  const [progress, setProgress] = useState(0)
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState(null)

  const extractData = useCallback(async (imageData) => {
    setIsProcessing(true)
    setProgress(0)
    setError(null)

    try {
      // Lazy-load Tesseract so it doesn't affect initial bundle
      const { createWorker } = await import('tesseract.js')
      const worker = await createWorker('eng', 1, {
        logger: (m) => {
          if (m.status === 'recognizing text') {
            setProgress(Math.round(m.progress * 100))
          } else if (m.status === 'loading tesseract core') {
            setProgress(5)
          } else if (m.status === 'loading language traineddata') {
            setProgress(15)
          } else if (m.status === 'initializing api') {
            setProgress(25)
          }
        },
      })

      const { data: { text } } = await worker.recognize(imageData)
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

function parseOCRText(text) {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean)
  const result = {}

  // Amount: look for Total/Amount/Due/Balance followed by a dollar figure
  const amountMatch =
    text.match(/(?:total|amount\s+due|balance\s+due|amount)[:\s]*\$?\s*([\d,]+\.?\d*)/i) ||
    text.match(/\$\s*([\d,]+\.\d{2})/)
  if (amountMatch) {
    const parsed = parseFloat(amountMatch[1].replace(/,/g, ''))
    if (!isNaN(parsed)) result.amount = parsed
  }

  // Invoice number
  const invNumMatch = text.match(/(?:invoice\s*(?:no|num|number|#)?|inv\.?\s*#?)[:\s#]*([A-Z0-9][-A-Z0-9]{2,19})/i)
  if (invNumMatch) result.invoiceNumber = invNumMatch[1].trim()

  // Due date
  const dueDateMatch =
    text.match(/(?:due\s*(?:date)?|payment\s+due)[:\s]+(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i) ||
    text.match(/(\d{4}-\d{2}-\d{2})/)
  if (dueDateMatch) result.dueDate = dueDateMatch[1]

  // Vendor: first meaningful line (skip very short or all-caps single words like "INVOICE")
  const vendorLine = lines.find(l => l.length > 2 && !/^invoice$/i.test(l))
  if (vendorLine) result.vendor = vendorLine.slice(0, 80)

  return result
}
