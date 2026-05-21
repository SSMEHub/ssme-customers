import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar.jsx'
import GlobalSearch from './GlobalSearch.jsx'

export default function AppShell() {
  // TODO: replace hardcoded role with supabase auth context in a future task
  const role = 'admin'

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      <Sidebar role={role} />
      <div className="ml-[220px] flex flex-col min-h-screen">
        <header className="h-14 bg-white border-b border-[#e0e2e6] flex items-center px-6 gap-4 sticky top-0 z-10">
          <GlobalSearch />
        </header>
        <main className="flex-1 p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
