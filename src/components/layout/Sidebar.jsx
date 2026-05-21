import { NavLink } from 'react-router-dom'

const NAV = [
  { to: '/', label: 'Dashboard', icon: '⊞' },
  { to: '/customers', label: 'Customers', icon: '⊙' },
  { to: '/vehicles', label: 'Vehicles', icon: '◻' },
  { to: '/import', label: 'Import', icon: '↑', adminOnly: true },
]

export default function Sidebar({ role }) {
  const links = NAV.filter((n) => !n.adminOnly || role === 'admin')
  return (
    <aside className="w-[220px] min-h-screen bg-white border-r border-[#e0e2e6] flex flex-col fixed left-0 top-0 bottom-0 z-20">
      <div className="h-14 flex items-center px-5 border-b border-[#e0e2e6]">
        <span className="font-bold text-[#181d26] tracking-tight text-sm">SSME Hub</span>
        <span className="ml-2 text-xs text-gray-400 font-normal">Module 1</span>
      </div>
      <nav className="flex-1 py-4 px-2 space-y-0.5">
        {links.map((n) => (
          <NavLink
            key={n.to}
            to={n.to}
            end={n.to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 rounded text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-[#f0f4ff] text-blue-700'
                  : 'text-gray-600 hover:bg-[#f8fafc] hover:text-[#181d26]'
              }`
            }
          >
            <span className="text-base leading-none">{n.icon}</span>
            {n.label}
          </NavLink>
        ))}
      </nav>
      <div className="p-4 border-t border-[#e0e2e6]">
        <p className="text-xs text-gray-400">Soon Seng Motors</p>
      </div>
    </aside>
  )
}
