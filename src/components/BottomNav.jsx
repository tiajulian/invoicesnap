import { Link, useLocation } from 'react-router-dom'
import { LayoutDashboard, FileText, PlusCircle, Settings } from 'lucide-react'

const ITEMS = [
  { to: '/',         icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/invoices', icon: FileText,         label: 'Invoices' },
  { to: '/add',      icon: PlusCircle,       label: 'Add',      primary: true },
  { to: '/settings', icon: Settings,         label: 'Settings' },
]

export default function BottomNav() {
  const { pathname } = useLocation()
  return (
    <nav className="sm:hidden fixed bottom-0 inset-x-0 bg-white border-t border-slate-200 z-20 safe-bottom"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
      <div className="flex">
        {ITEMS.map(({ to, icon: Icon, label, primary }) => {
          const active = pathname === to
          return (
            <Link
              key={to}
              to={to}
              className={`flex-1 flex flex-col items-center gap-0.5 py-2 transition-colors ${
                primary
                  ? active ? 'text-blue-700' : 'text-blue-600'
                  : active ? 'text-blue-600' : 'text-slate-400'
              }`}
            >
              <Icon className={`${primary ? 'w-7 h-7' : 'w-5 h-5'}`} strokeWidth={active ? 2.2 : 1.8} />
              <span className={`text-[10px] font-medium ${active ? 'font-semibold' : ''}`}>{label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
