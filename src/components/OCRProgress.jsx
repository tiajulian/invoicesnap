export default function OCRProgress({ progress, isProcessing, error, engine }) {
  if (!isProcessing && !error) return null
  const isDonut = engine === 'donut'

  return (
    <div className={`rounded-xl border p-4 space-y-2 ${
      isDonut ? 'bg-violet-50 border-violet-200' : 'bg-blue-50 border-blue-200'
    }`}>
      {isProcessing && (
        <>
          <div className={`flex justify-between text-sm font-medium ${
            isDonut ? 'text-violet-700' : 'text-blue-700'
          }`}>
            <span>{isDonut ? '✦ Donut AI reading invoice…' : 'Scanning invoice…'}</span>
            <span>{progress}%</span>
          </div>
          <div className={`w-full rounded-full h-2 overflow-hidden ${isDonut ? 'bg-violet-200' : 'bg-blue-200'}`}>
            <div
              className={`h-2 rounded-full transition-all duration-200 ${isDonut ? 'bg-violet-500' : 'bg-blue-500'}`}
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className={`text-xs ${isDonut ? 'text-violet-500' : 'text-blue-500'}`}>
            {isDonut
              ? progress < 60
                ? 'Downloading Donut model (~800 MB) — one time only, then cached…'
                : 'Analysing document structure…'
              : progress < 20
              ? 'Loading OCR engine (first run ~10 MB)…'
              : progress < 80
              ? 'Recognising text…'
              : 'Finishing up…'}
          </p>
        </>
      )}
      {error && (
        <p className="text-sm text-red-600">OCR error: {error}. You can still fill fields manually.</p>
      )}
    </div>
  )
}
