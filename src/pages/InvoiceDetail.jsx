import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import StatusChip from '../components/StatusChip'
import { formatCurrency, CURRENCIES } from '../utils/currency'
import { formatDate } from '../utils/dateFormat'
import { usePageTitle } from '../hooks/usePageTitle'

export default function InvoiceDetail({ invoices, onUpdate, onDelete, onToggleStatus }) {
  const { id } = useParams()
  const navigate = useNavigate()
  const invoice = invoices.find(inv => inv.id === id)
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState(invoice ?? {})
  const [amountError, setAmountError] = useState('')

  // Improvement #14: dynamic page title
  usePageTitle(invoice ? (invoice.vendor || 'Invoice Detail') : 'Not Found')

  if (!invoice) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-12 text-center space-y-3">
        <p className="text-4xl">🔍</p>
        <p className="text-lg text-gray-500">Invoice not found.</p>
        <button onClick={() => navigate('/')} className="text-blue-600 hover:underline text-sm">
          ← Back to dashboard
        </button>
      </div>
    )
  }

  const field = (key) => (val) => {
    setForm(f => ({ ...f, [key]: val }))
    if (key === 'amount') setAmountError('')
  }

  function handleSave() {
    if (form.amount !== '' && parseFloat(form.amount) < 0) {
      setAmountError('Amount cannot be negative.')
      return
    }
    onUpdate(invoice.id, form)
    setEditing(false)
  }

  function handleCancel() {
    setForm(invoice)
    setEditing(false)
  }

  // Bug #1: confirmation dialog is present (window.confirm)
  function handleDelete() {
    if (window.confirm('Delete this invoice? This cannot be undone.')) {
      onDelete(invoice.id)
      navigate('/')
    }
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        {/* Bug #8: aria-label on back button */}
        <button
          onClick={() => navigate(-1)}
          aria-label="Go back"
          title="Go back"
          className="text-gray-400 hover:text-gray-700 text-xl"
        >
          ←
        </button>
        <h1 className="text-xl font-bold text-gray-900 flex-1 truncate">
          {invoice.vendor || 'Invoice Detail'}
        </h1>
        <StatusChip status={invoice.status} onClick={() => onToggleStatus(invoice.id)} />
      </div>

      {/* Image */}
      {invoice.image && (
        <img
          src={invoice.image}
          alt="Invoice"
          className="w-full max-h-72 object-contain rounded-2xl border border-gray-200 bg-gray-50"
        />
      )}

      {/* View or Edit */}
      {editing ? (
        <div className="space-y-4">
          <EField label="Vendor" value={form.vendor} onChange={field('vendor')} placeholder="e.g. Acme Corp" />
          <EField label="Invoice Number" value={form.invoiceNumber} onChange={field('invoiceNumber')} placeholder="e.g. INV-0042" />
          <div className="grid grid-cols-2 gap-4">
            <EField label="Amount" value={form.amount} onChange={field('amount')} type="number" min="0" step="0.01" placeholder="0.00" error={amountError} />
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Currency</label>
              {/* Bug #6: show full currency names, matching the Add form */}
              <select
                value={form.currency || 'AUD'}
                onChange={e => field('currency')(e.target.value)}
                className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              >
                {CURRENCIES.map(c => (
                  <option key={c.code} value={c.code}>{c.code} — {c.label}</option>
                ))}
              </select>
            </div>
          </div>
          <EField label="Due Date" value={form.dueDate} onChange={field('dueDate')} type="date" />
          {/* Bug #7: notes field has placeholder in edit mode */}
          <EField label="Notes" value={form.notes} onChange={field('notes')} placeholder="Optional notes…" />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
            <div className="grid grid-cols-2 rounded-xl overflow-hidden border border-gray-200">
              {[
                { value: 'unpaid', label: '⏳ Unpaid', active: 'bg-amber-500 text-white' },
                { value: 'paid',   label: '✓ Paid',   active: 'bg-green-500 text-white' },
              ].map(s => (
                <button
                  key={s.value}
                  onClick={() => field('status')(s.value)}
                  className={`py-2.5 text-sm font-semibold transition-colors ${
                    (form.status || invoice.status) === s.value
                      ? s.active
                      : 'bg-white text-gray-400 hover:bg-gray-50'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleSave}
              className="flex-1 bg-blue-600 text-white py-2.5 rounded-xl font-semibold hover:bg-blue-700 transition-colors"
            >
              Save Changes
            </button>
            <button
              onClick={handleCancel}
              className="px-5 border border-gray-300 rounded-xl text-gray-600 hover:bg-gray-100"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="bg-white rounded-2xl border border-gray-200 divide-y divide-gray-100">
            <Row label="Vendor" value={invoice.vendor} />
            <Row label="Invoice #" value={invoice.invoiceNumber} />
            <Row label="Amount" value={formatCurrency(invoice.amount, invoice.currency)} />
            {/* Improvement #10: show currency in detail view */}
            {invoice.currency && invoice.currency !== 'AUD' && (
              <Row label="Currency" value={`${invoice.currency} — ${CURRENCIES.find(c => c.code === invoice.currency)?.label ?? invoice.currency}`} />
            )}
            {/* Bug #4: format due date consistently */}
            <Row label="Due Date" value={formatDate(invoice.dueDate)} />
            <Row label="Status" value={invoice.status === 'paid' ? '✓ Paid' : '⏳ Unpaid'} />
            {/* Added date also formatted via toLocaleDateString for consistency */}
            <Row label="Added" value={new Date(invoice.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })} />
            {invoice.notes && <Row label="Notes" value={invoice.notes} />}
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setEditing(true)}
              className="flex-1 border border-gray-300 text-gray-700 py-2.5 rounded-xl font-semibold hover:bg-gray-50 transition-colors"
            >
              Edit
            </button>
            <button
              onClick={handleDelete}
              className="flex-1 bg-red-50 border border-red-200 text-red-600 py-2.5 rounded-xl font-semibold hover:bg-red-100 transition-colors"
            >
              Delete
            </button>
          </div>
        </>
      )}
    </div>
  )
}

function Row({ label, value }) {
  if (!value) return null
  return (
    <div className="flex justify-between items-start px-4 py-3 text-sm">
      <span className="text-gray-500 w-28 flex-shrink-0">{label}</span>
      <span className="font-medium text-gray-900 text-right">{value}</span>
    </div>
  )
}

function EField({ label, value, onChange, type = 'text', placeholder, min, step, error }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <input
        type={type}
        value={value ?? ''}
        min={min}
        step={step}
        placeholder={placeholder}
        onChange={e => onChange(e.target.value)}
        className={`w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 transition-colors ${
          error ? 'border-red-400 focus:ring-red-400 bg-red-50' : 'border-gray-300 focus:ring-blue-400'
        }`}
      />
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  )
}
