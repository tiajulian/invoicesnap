import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import StatusChip from '../components/StatusChip'
import { formatCurrency } from '../utils/currency'
import { CURRENCIES } from '../utils/currency'

export default function InvoiceDetail({ invoices, onUpdate, onDelete, onToggleStatus }) {
  const { id } = useParams()
  const navigate = useNavigate()
  const invoice = invoices.find(inv => inv.id === id)
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState(invoice ?? {})

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

  const field = (key) => (val) => setForm(f => ({ ...f, [key]: val }))

  function handleSave() {
    onUpdate(invoice.id, form)
    setEditing(false)
  }

  function handleCancel() {
    setForm(invoice)
    setEditing(false)
  }

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
        <button onClick={() => navigate(-1)} className="text-gray-400 hover:text-gray-700 text-xl">←</button>
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
          <EField label="Vendor" value={form.vendor} onChange={field('vendor')} />
          <EField label="Invoice Number" value={form.invoiceNumber} onChange={field('invoiceNumber')} />
          <div className="grid grid-cols-2 gap-4">
            <EField label="Amount" value={form.amount} onChange={field('amount')} type="number" />
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Currency</label>
              <select
                value={form.currency || 'USD'}
                onChange={e => field('currency')(e.target.value)}
                className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              >
                {CURRENCIES.map(c => <option key={c.code} value={c.code}>{c.code}</option>)}
              </select>
            </div>
          </div>
          <EField label="Due Date" value={form.dueDate} onChange={field('dueDate')} type="date" />
          <EField label="Notes" value={form.notes} onChange={field('notes')} />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
            <div className="flex gap-2">
              {['unpaid', 'paid'].map(s => (
                <button
                  key={s}
                  onClick={() => field('status')(s)}
                  className={`px-4 py-1.5 rounded-full text-sm font-semibold capitalize transition-colors ${
                    (form.status || invoice.status) === s
                      ? s === 'paid' ? 'bg-green-500 text-white' : 'bg-amber-500 text-white'
                      : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                  }`}
                >
                  {s}
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
            <Row label="Due Date" value={invoice.dueDate} />
            <Row label="Status" value={invoice.status === 'paid' ? '✓ Paid' : '⏳ Unpaid'} />
            <Row label="Added" value={new Date(invoice.createdAt).toLocaleDateString()} />
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

function EField({ label, value, onChange, type = 'text' }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <input
        type={type}
        value={value ?? ''}
        onChange={e => onChange(e.target.value)}
        className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
      />
    </div>
  )
}
