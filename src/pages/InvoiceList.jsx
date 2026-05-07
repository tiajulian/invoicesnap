import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import InvoiceCard from '../components/InvoiceCard'

const SORT_OPTIONS = [
  { value: 'createdAt_desc', label: 'Newest first' },
  { value: 'createdAt_asc',  label: 'Oldest first' },
  { value: 'dueDate_asc',    label: 'Due date (soonest)' },
  { value: 'amount_desc',    label: 'Amount (highest)' },
  { value: 'amount_asc',     label: 'Amount (lowest)' },
]

export default function InvoiceList({ invoices, onToggleStatus }) {
  const navigate = useNavigate()
  const [filter, setFilter] = useState('all')
  const [sort, setSort] = useState('createdAt_desc')

  const filtered = invoices.filter(inv => filter === 'all' || inv.status === filter)

  const sorted = [...filtered].sort((a, b) => {
    const [field, dir] = sort.split('_')
    let aVal = field === 'amount' ? parseFloat(a[field] || 0) : (a[field] || '')
    let bVal = field === 'amount' ? parseFloat(b[field] || 0) : (b[field] || '')
    if (aVal < bVal) return dir === 'asc' ? -1 : 1
    if (aVal > bVal) return dir === 'asc' ? 1 : -1
    return 0
  })

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">All Invoices</h1>
        <button
          onClick={() => navigate('/add')}
          className="bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors"
        >
          + Add
        </button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
          {['all', 'paid', 'unpaid'].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1 rounded-lg text-sm font-medium capitalize transition-colors ${
                filter === f ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        <select
          value={sort}
          onChange={e => setSort(e.target.value)}
          className="border border-gray-200 rounded-xl px-3 py-1.5 text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-400"
        >
          {SORT_OPTIONS.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>

        <span className="text-sm text-gray-400 ml-auto">
          {sorted.length} invoice{sorted.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* List */}
      {sorted.length === 0 ? (
        <p className="text-center text-gray-400 py-16">No invoices match this filter.</p>
      ) : (
        <div className="space-y-3">
          {sorted.map(inv => (
            <InvoiceCard key={inv.id} invoice={inv} onToggleStatus={onToggleStatus} />
          ))}
        </div>
      )}
    </div>
  )
}
