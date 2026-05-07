import { HashRouter, Routes, Route } from 'react-router-dom'
import Navbar from './components/Navbar'
import Dashboard from './pages/Dashboard'
import InvoiceList from './pages/InvoiceList'
import AddInvoice from './pages/AddInvoice'
import InvoiceDetail from './pages/InvoiceDetail'
import { useInvoices } from './hooks/useInvoices'

export default function App() {
  const { invoices, addInvoice, updateInvoice, deleteInvoice, toggleStatus, exportJSON } = useInvoices()

  return (
    <HashRouter>
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <Routes>
          <Route
            path="/"
            element={<Dashboard invoices={invoices} onToggleStatus={toggleStatus} onExport={exportJSON} />}
          />
          <Route
            path="/invoices"
            element={<InvoiceList invoices={invoices} onToggleStatus={toggleStatus} />}
          />
          <Route
            path="/add"
            element={<AddInvoice onAdd={addInvoice} />}
          />
          <Route
            path="/invoice/:id"
            element={
              <InvoiceDetail
                invoices={invoices}
                onUpdate={updateInvoice}
                onDelete={deleteInvoice}
                onToggleStatus={toggleStatus}
              />
            }
          />
        </Routes>
      </div>
    </HashRouter>
  )
}
