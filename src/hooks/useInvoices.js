import { useState, useCallback } from 'react'
import { loadInvoices, saveInvoices } from '../utils/storage'
import { exportToExcel } from '../utils/exportExcel'
import { getDefaultCurrency } from '../utils/settings'

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
      currency: getDefaultCurrency(),
      ...data,
      amount:   normalizeAmount(data.amount),
      // subtotal always populated: use the entered value, or fall back to amount when no GST breakdown
      subtotal: (data.subtotal !== '' && data.subtotal !== undefined)
        ? normalizeAmount(data.subtotal)
        : normalizeAmount(data.amount),
      // gst only set when explicitly provided
      gst: (data.gst !== '' && data.gst !== undefined)
        ? normalizeAmount(data.gst)
        : undefined,
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
      const amount = normalizeAmount(updates.amount)
      const normalized = {
        ...updates,
        amount,
        // subtotal: use entered value or fall back to total
        subtotal: (updates.subtotal !== '' && updates.subtotal !== undefined)
          ? normalizeAmount(updates.subtotal)
          : amount,
        // gst: only set when explicitly provided
        gst: (updates.gst !== '' && updates.gst !== undefined)
          ? normalizeAmount(updates.gst)
          : undefined,
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

  const exportExcel = useCallback(() => {
    exportToExcel(invoices)
  }, [invoices])

  return { invoices, addInvoice, updateInvoice, deleteInvoice, toggleStatus, exportExcel }
}
