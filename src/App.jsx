import { HashRouter, Routes, Route } from 'react-router-dom'
import Navbar from './components/Navbar'
import BottomNav from './components/BottomNav'
import Dashboard from './pages/Dashboard'
import InvoiceList from './pages/InvoiceList'
import AddInvoice from './pages/AddInvoice'
import InvoiceDetail from './pages/InvoiceDetail'
import Settings from './pages/Settings'
import { useInvoices } from './hooks/useInvoices'

export default function App() {
  const { invoices, addInvoice, updateInvoice, deleteInvoice, toggleStatus, exportExcel } = useInvoices()

  return (
    <HashRouter>
      {/* pb-20 on mobile gives space above the bottom nav bar */}
      <div className="min-h-screen bg-slate-50 pb-20 sm:pb-0">
        <Navbar />
        <Routes>
          <Route path="/"
            element={<Dashboard invoices={invoices} onToggleStatus={toggleStatus} onExport={exportExcel} />}
          />
          <Route path="/invoices"
            element={<InvoiceList invoices={invoices} onToggleStatus={toggleStatus} />}
          />
          <Route path="/add"
            element={<AddInvoice onAdd={addInvoice} />}
          />
          <Route path="/invoice/:id"
            element={
              <InvoiceDetail
                invoices={invoices}
                onUpdate={updateInvoice}
                onDelete={deleteInvoice}
                onToggleStatus={toggleStatus}
              />
            }
          />
          <Route path="/settings" element={<Settings />} />
        </Routes>
        <BottomNav />
      </div>
    </HashRouter>
  )
}
