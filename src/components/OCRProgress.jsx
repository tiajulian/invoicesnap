export default function OCRProgress({ progress, isProcessing, error }) {
  if (!isProcessing && !error) return null
  return (
    <div className="rounded-xl bg-blue-50 border border-blue-200 p-4 space-y-2">
      {isProcessing && (
        <>
          <div className="flex justify-between text-sm font-medium text-blue-700">
            <span>Scanning invoice…</span>
            <span>{progress}%</span>
          </div>
          <div className="w-full bg-blue-200 rounded-full h-2 overflow-hidden">
            <div
              className="bg-blue-500 h-2 rounded-full transition-all duration-200"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-xs text-blue-500">
            {progress < 20
              ? 'Loading OCR engine (first run downloads ~10 MB)…'
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
