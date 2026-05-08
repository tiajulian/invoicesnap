const ENGINE_STYLE = {
  gemini:    { bg: 'bg-blue-50',   border: 'border-blue-200',   text: 'text-blue-700',   bar: 'bg-blue-500',   sub: 'text-blue-500' },
  donut:     { bg: 'bg-violet-50', border: 'border-violet-200', text: 'text-violet-700', bar: 'bg-violet-500', sub: 'text-violet-500' },
  tesseract: { bg: 'bg-gray-50',   border: 'border-gray-200',   text: 'text-gray-700',   bar: 'bg-gray-500',   sub: 'text-gray-400' },
}

export default function OCRProgress({ progress, isProcessing, error, engine }) {
  if (!isProcessing && !error) return null
  const s = ENGINE_STYLE[engine] ?? ENGINE_STYLE.tesseract

  function label() {
    if (engine === 'gemini') return '✦ Gemini reading invoice…'
    if (engine === 'donut')  return '✦ Donut AI reading invoice…'
    return 'Scanning invoice…'
  }

  function sublabel() {
    if (engine === 'gemini') return 'Sending image to Google Gemini…'
    if (engine === 'donut')  return progress < 60 ? 'Downloading Donut model (~800 MB) — one time only…' : 'Analysing document structure…'
    return progress < 20 ? 'Loading OCR engine (first run ~10 MB)…' : progress < 80 ? 'Recognising text…' : 'Finishing up…'
  }

  return (
    <div className={`rounded-xl border p-4 space-y-2 ${s.bg} ${s.border}`}>
      {isProcessing && (
        <>
          <div className={`flex justify-between text-sm font-medium ${s.text}`}>
            <span>{label()}</span>
            <span>{progress}%</span>
          </div>
          <div className="w-full bg-black/10 rounded-full h-2 overflow-hidden">
            <div className={`h-2 rounded-full transition-all duration-200 ${s.bar}`} style={{ width: `${progress}%` }} />
          </div>
          <p className={`text-xs ${s.sub}`}>{sublabel()}</p>
        </>
      )}
      {error && <p className="text-sm text-red-600">OCR error: {error}. You can still fill fields manually.</p>}
    </div>
  )
}
