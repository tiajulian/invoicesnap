import { useState, useCallback } from 'react'
import { loadInvoices, saveInvoices } from '../utils/storage'

function uid() {
  return typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : Date.now().toString(36) + Math.random().toString(36).slice(2)
}

// Bug #5: always coerce amount to a float so numeric sorting is correct
function normalizeAmount(raw) {
  const n = parseFloat(raw)
  return isNaN(n) ? 0 : Math.max(0, n)
}

export function useInvoices() {
  const [invoices, setInvoices] = useState(() => loadInvoices())

  const addInvoice = useCallback((data) => {
    const invoice = {
      id: uid(),
      createdAt: new Date().toISOString(),
      status: 'unpaid',
      currency: 'USD',
      ...data,
      amount: normalizeAmount(data.amount),
    }
    setInvoices(prev => {
      const next = [invoice, ...prev]
      saveInvoices(next)
      return next
    })
    return invoice.id
  }, [])

  const updateInvoice = useCallback((id, updates) => {
    setInvoices(prev => {
      const normalized = {
        ...updates,
        ...(updates.amount !== undefined && { amount: normalizeAmount(updates.amount) }),
      }
      const next = prev.map(inv => (inv.id === id ? { ...inv, ...normalized } : inv))
      saveInvoices(next)
      return next
    })
  }, [])

  const deleteInvoice = useCallback((id) => {
    setInvoices(prev => {
      const next = prev.filter(inv => inv.id !== id)
      saveInvoices(next)
      return next
    })
  }, [])

  const toggleStatus = useCallback((id) => {
    setInvoices(prev => {
      const next = prev.map(inv =>
        inv.id === id ? { ...inv, status: inv.status === 'paid' ? 'unpaid' : 'paid' } : inv,
      )
      saveInvoices(next)
      return next
    })
  }, [])

  const exportJSON = useCallback(() => {
    const blob = new Blob([JSON.stringify(invoices, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `invoicesnap-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }, [invoices])

  return { invoices, addInvoice, updateInvoice, deleteInvoice, toggleStatus, exportJSON }
}
