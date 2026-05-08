import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useOCR } from '../hooks/useOCR'
import { usePageTitle } from '../hooks/usePageTitle'
import OCRProgress from '../components/OCRProgress'
import { CURRENCIES } from '../utils/currency'
import { getDefaultCurrency } from '../utils/settings'

function makeBlank() {
  return { vendor: '', invoiceNumber: '', amount: '', dueDate: '', currency: getDefaultCurrency(), notes: '' }
}

async function resizeImage(dataUrl, maxPx = 1200) {
  return new Promise(resolve => {
    const img = new Image()
    img.onload = () => {
      const scale = Math.min(1, maxPx / Math.max(img.width, img.height))
      const w = Math.round(img.width * scale)
      const h = Math.round(img.height * scale)
      const canvas = document.createElement('canvas')
      canvas.width = w
      canvas.height = h
      canvas.getContext('2d').drawImage(img, 0, 0, w, h)
      resolve(canvas.toDataURL('image/jpeg', 0.75))
    }
    img.src = dataUrl
  })
}

export default function AddInvoice({ onAdd }) {
  const navigate = useNavigate()
  usePageTitle('Add Invoice')
  const { extractData, progress, isProcessing, error: ocrError } = useOCR()

  const [image, setImage]           = useState(null)
  const [form, setForm]             = useState(makeBlank)
  const [status, setStatus]         = useState('unpaid')
  const [cameraActive, setCameraActive] = useState(false)
  const [vendorError, setVendorError]   = useState('')
  const [amountError, setAmountError]   = useState('')
  const [uploadError, setUploadError]   = useState('')
  const [toast, setToast]           = useState('')

  const fileRef   = useRef(null)
  const videoRef  = useRef(null)
  const streamRef = useRef(null)

  // Attach stream once the <video> element is in the DOM.
  // requestAnimationFrame isn't reliable on mobile — React may not have
  // committed the render yet when it fires.
  useEffect(() => {
    if (cameraActive && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current
      videoRef.current.play().catch(() => {})
    }
  }, [cameraActive])

  const field = (key) => (val) => {
    setForm(f => ({ ...f, [key]: val }))
    if (key === 'vendor') setVendorError('')
    if (key === 'amount') setAmountError('')
  }

  async function processImage(dataUrl) {
    const resized = await resizeImage(dataUrl)
    setImage(resized)
    const extracted = await extractData(resized)
    setForm(prev => ({
      ...prev,
      ...Object.fromEntries(
        Object.entries(extracted).filter(([, v]) => v !== undefined && v !== null && v !== ''),
      ),
    }))
  }

  async function handleFile(file) {
    setUploadError('')
    // Client-side file type validation
    if (!file.type.startsWith('image/')) {
      setUploadError('Please select an image file (JPG, PNG, etc.)')
      return
    }
    if (file.size > 20 * 1024 * 1024) {
      setUploadError('Image is too large — please use one under 20 MB.')
      return
    }
    const reader = new FileReader()
    reader.onload = e => processImage(e.target.result)
    reader.readAsDataURL(file)
  }

  async function startCamera() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } },
      })
      streamRef.current = stream
      setCameraActive(true)
      // Stream is attached via the useEffect above once <video> renders
    } catch (err) {
      const msg =
        err.name === 'NotAllowedError' ? 'Camera access was denied. Allow camera access in your browser settings and try again.' :
        err.name === 'NotFoundError'   ? 'No camera found on this device.' :
        'Camera unavailable — please upload a file instead.'
      alert(msg)
    }
  }

  function stopCamera() {
    streamRef.current?.getTracks().forEach(t => t.stop())
    setCameraActive(false)
  }

  async function capturePhoto() {
    const video = videoRef.current
    if (!video) return
    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    canvas.getContext('2d').drawImage(video, 0, 0)
    stopCamera()
    await processImage(canvas.toDataURL('image/jpeg', 0.82))
  }

  function handleSave() {
    let hasError = false
    if (!form.vendor.trim()) {
      setVendorError('Vendor name is required.')
      hasError = true
    }
    if (form.amount !== '' && parseFloat(form.amount) < 0) {
      setAmountError('Amount cannot be negative.')
      hasError = true
    }
    if (hasError) return

    onAdd({ ...form, image, status })
    setToast('Invoice saved!')
    setTimeout(() => navigate('/'), 1200)
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
      {/* Toast */}
      {toast && (
        <div role="status" aria-live="polite" className="fixed bottom-6 inset-x-0 flex justify-center pointer-events-none z-50">
          <div className="bg-gray-900 text-white px-5 py-2.5 rounded-xl text-sm font-medium shadow-xl">
            ✓ {toast}
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => navigate(-1)}
          aria-label="Go back"
          title="Go back"
          className="text-gray-400 hover:text-gray-700 text-xl"
        >
          ←
        </button>
        <h1 className="text-2xl font-bold text-gray-900">Add Invoice</h1>
      </div>

      {/* Image capture area */}
      {!image && !cameraActive && (
        <div className="border-2 border-dashed border-gray-300 rounded-2xl p-10 text-center space-y-4 bg-gray-50">
          <p className="text-gray-400 text-sm">Capture or upload an invoice image — Gemini AI will pre-fill the fields</p>
          <div className="flex gap-3 justify-center flex-wrap">
            <button
              type="button"
              onClick={startCamera}
              className="bg-blue-600 text-white px-5 py-2.5 rounded-xl font-semibold hover:bg-blue-700 transition-colors"
            >
              📷 Use Camera
            </button>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="border border-gray-300 text-gray-700 px-5 py-2.5 rounded-xl font-semibold hover:bg-gray-100 transition-colors"
            >
              📁 Upload File
            </button>
          </div>
          {uploadError && <p role="alert" className="text-sm text-red-600">{uploadError}</p>}
          <p className="text-xs text-gray-400">JPG, PNG — image stays on your device, never stored externally</p>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={e => e.target.files[0] && handleFile(e.target.files[0])}
          />
        </div>
      )}

      {/* Live camera */}
      {cameraActive && (
        <div className="space-y-3">
          <div className="relative rounded-2xl overflow-hidden bg-black">
            <video ref={videoRef} autoPlay playsInline muted className="w-full block" />
            <div className="absolute inset-0 pointer-events-none"
              style={{ background: 'radial-gradient(ellipse 80% 70% at 50% 50%, transparent 55%, rgba(0,0,0,0.55) 100%)' }}
            />
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="relative w-[88%] h-[72%]">
                {['top-0 left-0 border-t-[3px] border-l-[3px] rounded-tl-sm',
                  'top-0 right-0 border-t-[3px] border-r-[3px] rounded-tr-sm',
                  'bottom-0 left-0 border-b-[3px] border-l-[3px] rounded-bl-sm',
                  'bottom-0 right-0 border-b-[3px] border-r-[3px] rounded-br-sm',
                ].map((cls, i) => <div key={i} className={`absolute w-7 h-7 border-white ${cls}`} />)}
              </div>
            </div>
            <div className="absolute bottom-0 left-0 right-0 bg-black/50 px-3 py-2 pointer-events-none">
              <p className="text-white text-xs text-center">
                Hold phone directly above the invoice • Fill the frame • Keep steady
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            <button type="button" onClick={capturePhoto}
              className="flex-1 bg-blue-600 text-white py-2.5 rounded-xl font-semibold hover:bg-blue-700 transition-colors">
              📸 Capture
            </button>
            <button type="button" onClick={stopCamera}
              className="px-5 border border-gray-300 rounded-xl text-gray-600 hover:bg-gray-100">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Preview */}
      {image && (
        <div className="space-y-2">
          <img src={image} alt="Invoice preview"
            className="w-full max-h-56 object-contain rounded-2xl border border-gray-200 bg-gray-50" />
          <button type="button" onClick={() => { setImage(null); setForm(makeBlank()) }}
            className="text-sm text-red-500 hover:text-red-700">
            Remove image
          </button>
        </div>
      )}

      <OCRProgress progress={progress} isProcessing={isProcessing} error={ocrError} />

      {/* Form */}
      <div className="space-y-4">
        <Field
          id="vendor" label="Vendor Name *" autoComplete="organization"
          value={form.vendor} onChange={field('vendor')}
          placeholder="e.g. Acme Corp" error={vendorError}
        />
        <Field
          id="invoiceNumber" label="Invoice Number" autoComplete="off"
          value={form.invoiceNumber} onChange={field('invoiceNumber')}
          placeholder="e.g. INV-0042"
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field
            id="amount" label="Amount" type="number"
            min="0" step="0.01" autoComplete="off"
            value={form.amount} onChange={field('amount')}
            placeholder="0.00" error={amountError}
          />
          <div>
            <label htmlFor="currency" className="block text-sm font-medium text-gray-700 mb-1">Currency</label>
            <select
              id="currency" name="currency"
              value={form.currency}
              onChange={e => field('currency')(e.target.value)}
              className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            >
              {CURRENCIES.map(c => (
                <option key={c.code} value={c.code}>{c.code} — {c.label}</option>
              ))}
            </select>
          </div>
        </div>

        <Field id="dueDate" label="Due Date" type="date" autoComplete="off"
          value={form.dueDate} onChange={field('dueDate')} />

        {/* Notes — textarea for multi-line input */}
        <div>
          <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
          <textarea
            id="notes" name="notes"
            value={form.notes}
            rows={3}
            onChange={e => field('notes')(e.target.value)}
            placeholder="Optional notes…"
            autoComplete="off"
            className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
          />
        </div>

        {/* Status — segmented control */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
          <div className="grid grid-cols-2 rounded-xl overflow-hidden border border-gray-200">
            {[
              { value: 'unpaid', label: '⏳ Unpaid', active: 'bg-amber-500 text-white' },
              { value: 'paid',   label: '✓ Paid',   active: 'bg-green-500 text-white' },
            ].map(s => (
              <button
                key={s.value}
                type="button"
                onClick={() => setStatus(s.value)}
                className={`py-2.5 text-sm font-semibold transition-colors ${
                  status === s.value ? s.active : 'bg-white text-gray-400 hover:bg-gray-50'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={handleSave}
        disabled={isProcessing}
        className="w-full bg-blue-600 text-white py-3 rounded-2xl font-bold text-base hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-sm"
      >
        {isProcessing ? 'Scanning…' : 'Save Invoice'}
      </button>
    </div>
  )
}

function Field({ id, label, value, onChange, placeholder, type = 'text', min, step, error, autoComplete = 'off' }) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <input
        id={id}
        name={id}
        type={type}
        value={value}
        min={min}
        step={step}
        autoComplete={autoComplete}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className={`w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 transition-colors ${
          error ? 'border-red-400 focus:ring-red-400 bg-red-50' : 'border-gray-300 focus:ring-blue-400'
        }`}
      />
      {error && <p role="alert" className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  )
}
