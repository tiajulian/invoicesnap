import { Link, useLocation } from 'react-router-dom'
import { Receipt } from 'lucide-react'

const LINKS = [
  { to: '/',         label: 'Dashboard' },
  { to: '/invoices', label: 'Invoices' },
  { to: '/settings', label: 'Settings' },
]

export default function Navbar() {
  const { pathname } = useLocation()
  return (
    <nav className="bg-white sticky top-0 z-10"
      style={{ boxShadow: '0 1px 0 #E2E8F0, 0 1px 4px rgba(0,0,0,0.06)' }}>
      <div className="max-w-5xl mx-auto px-4 flex items-center justify-between h-14">

        <Link to="/" className="flex items-center gap-2 font-bold text-blue-600 text-lg tracking-tight">
          <Receipt className="w-5 h-5" />
          InvoiceSnap
        </Link>

        <div className="flex gap-1 items-center">
          {LINKS.map(link => (
            <Link
              key={link.to}
              to={link.to}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                pathname === link.to
                  ? 'bg-blue-50 text-blue-600'
                  : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              {link.label}
            </Link>
          ))}
        </div>

      </div>
    </nav>
  )
}
