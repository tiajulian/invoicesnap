import { Link, useLocation } from 'react-router-dom'

const LINKS = [
  { to: '/',         label: 'Dashboard' },
  { to: '/invoices', label: 'Invoices' },
  { to: '/add',      label: '+ Add' },
]

export default function Navbar() {
  const { pathname } = useLocation()
  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-10 shadow-sm">
      <div className="max-w-3xl mx-auto px-4 flex items-center justify-between h-14">
        <Link to="/" className="font-extrabold text-blue-600 text-xl tracking-tight">
          🧾 InvoiceSnap
        </Link>
        <div className="flex gap-1 items-center">
          {LINKS.map(link => (
            <Link
              key={link.to}
              to={link.to}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                pathname === link.to
                  ? 'bg-blue-50 text-blue-600'
                  : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              {link.label}
            </Link>
          ))}
          <Link
            to="/settings"
            className={`ml-1 px-2.5 py-1.5 rounded-lg text-sm transition-colors ${
              pathname === '/settings'
                ? 'bg-blue-50 text-blue-600'
                : 'text-gray-400 hover:text-gray-700 hover:bg-gray-100'
            }`}
          >
            ⚙
          </Link>
        </div>
      </div>
    </nav>
  )
}
