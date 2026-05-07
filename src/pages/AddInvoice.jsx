import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useOCR } from '../hooks/useOCR'
import { usePageTitle } from '../hooks/usePageTitle'
import OCRProgress from '../components/OCRProgress'
import { CURRENCIES } from '../utils/currency'

const BLANK = { vendor: '', invoiceNumber: '', amount: '', dueDate: '', currency: 'USD', notes: '' }

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
  usePageTitle('Add Invoice') // Improvement #14
  const { extractData, progress, isProcessing, error, engine } = useOCR()
  const [image, setImage] = useState(null)
  const [form, setForm] = useState(BLANK)
  const [status, setStatus] = useState('unpaid')
  const [cameraActive, setCameraActive] = useState(false)
  const [vendorError, setVendorError] = useState('')   // Bug #3
  const [amountError, setAmountError] = useState('')   // Bug #2
  const fileRef = useRef(null)
  const videoRef = useRef(null)
  const streamRef = useRef(null)

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
      requestAnimationFrame(() => {
        if (videoRef.current) videoRef.current.srcObject = stream
      })
    } catch {
      alert('Camera unavailable — please upload a file instead.')
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
    navigate('/')
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
      {/* Back + title */}
      <div className="flex items-center gap-3">
        {/* Bug #8: aria-label for back button */}
        <button
          onClick={() => navigate(-1)}
          aria-label="Go back"
          className="text-gray-400 hover:text-gray-700 text-xl"
        >
          ←
        </button>
        <h1 className="text-2xl font-bold text-gray-900">Add Invoice</h1>
      </div>

      {/* Image capture area */}
      {!image && !cameraActive && (
        <div className="border-2 border-dashed border-gray-300 rounded-2xl p-10 text-center space-y-4 bg-gray-50">
          <p className="text-gray-400 text-sm">Capture or upload an invoice image — OCR will pre-fill the fields</p>
          <div className="flex gap-3 justify-center flex-wrap">
            <button
              onClick={startCamera}
              className="bg-blue-600 text-white px-5 py-2.5 rounded-xl font-semibold hover:bg-blue-700 transition-colors"
            >
              📷 Use Camera
            </button>
            <button
              onClick={() => fileRef.current?.click()}
              className="border border-gray-300 text-gray-700 px-5 py-2.5 rounded-xl font-semibold hover:bg-gray-100 transition-colors"
            >
              📁 Upload File
            </button>
          </div>
          <p className="text-xs text-gray-400">JPG, PNG — image stays on your device, never uploaded</p>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={e => e.target.files[0] && handleFile(e.target.files[0])}
          />
        </div>
      )}

      {/* Live camera with alignment guide */}
      {cameraActive && (
        <div className="space-y-3">
          <div className="relative rounded-2xl overflow-hidden bg-black">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              className="w-full block"
            />

            {/* Dark vignette outside the guide zone */}
            <div className="absolute inset-0 pointer-events-none"
              style={{
                background: `radial-gradient(ellipse 80% 70% at 50% 50%, transparent 55%, rgba(0,0,0,0.55) 100%)`
              }}
            />

            {/* Guide rectangle with corner brackets */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="relative w-[88%] h-[72%]">
                {/* Corner L-shapes */}
                {[
                  'top-0 left-0 border-t-[3px] border-l-[3px] rounded-tl-sm',
                  'top-0 right-0 border-t-[3px] border-r-[3px] rounded-tr-sm',
                  'bottom-0 left-0 border-b-[3px] border-l-[3px] rounded-bl-sm',
                  'bottom-0 right-0 border-b-[3px] border-r-[3px] rounded-br-sm',
                ].map((cls, i) => (
                  <div key={i} className={`absolute w-7 h-7 border-white ${cls}`} />
                ))}
              </div>
            </div>

            {/* Tip text at the bottom of the video */}
            <div className="absolute bottom-0 left-0 right-0 bg-black/50 px-3 py-2 pointer-events-none">
              <p className="text-white text-xs text-center">
                Hold phone directly above the invoice • Fill the frame • Keep steady
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={capturePhoto}
              className="flex-1 bg-blue-600 text-white py-2.5 rounded-xl font-semibold hover:bg-blue-700 transition-colors"
            >
              📸 Capture
            </button>
            <button
              onClick={stopCamera}
              className="px-5 border border-gray-300 rounded-xl text-gray-600 hover:bg-gray-100"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Preview */}
      {image && (
        <div className="space-y-2">
          <img
            src={image}
            alt="Invoice preview"
            className="w-full max-h-56 object-contain rounded-2xl border border-gray-200 bg-gray-50"
          />
          <button
            onClick={() => { setImage(null); setForm(BLANK) }}
            className="text-sm text-red-500 hover:text-red-700"
          >
            Remove image
          </button>
        </div>
      )}

      <OCRProgress progress={progress} isProcessing={isProcessing} error={error} engine={engine} />

      {/* Form fields */}
      <div className="space-y-4">
        {/* Bug #3: vendor field with inline error */}
        <Field
          label="Vendor Name *"
          value={form.vendor}
          onChange={field('vendor')}
          placeholder="e.g. Acme Corp"
          error={vendorError}
        />
        <Field
          label="Invoice Number"
          value={form.invoiceNumber}
          onChange={field('invoiceNumber')}
          placeholder="e.g. INV-0042"
        />

        <div className="grid grid-cols-2 gap-4">
          <Field
            label="Amount"
            value={form.amount}
            onChange={field('amount')}
            placeholder="0.00"
            type="number"
            min="0"
            step="0.01"
            error={amountError}
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Currency</label>
            <select
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

        <Field label="Due Date" value={form.dueDate} onChange={field('dueDate')} type="date" />
        <Field
          label="Notes"
          value={form.notes}
          onChange={field('notes')}
          placeholder="Optional notes…"
        />

        {/* Status toggle */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
          <div className="flex gap-2">
            {['unpaid', 'paid'].map(s => (
              <button
                key={s}
                onClick={() => setStatus(s)}
                className={`px-4 py-1.5 rounded-full text-sm font-semibold capitalize transition-colors ${
                  status === s
                    ? s === 'paid'
                      ? 'bg-green-500 text-white'
                      : 'bg-amber-500 text-white'
                    : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      </div>

      <button
        onClick={handleSave}
        disabled={isProcessing}
        className="w-full bg-blue-600 text-white py-3 rounded-2xl font-bold text-base hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-sm"
      >
        {isProcessing ? 'Scanning…' : 'Save Invoice'}
      </button>
    </div>
  )
}

function Field({ label, value, onChange, placeholder, type = 'text', min, step, error }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <input
        type={type}
        value={value}
        min={min}
        step={step}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className={`w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 transition-colors ${
          error
            ? 'border-red-400 focus:ring-red-400 bg-red-50'
            : 'border-gray-300 focus:ring-blue-400'
        }`}
      />
      {/* Bug #3: inline error message */}
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  )
}
