import { Outlet, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import Sidebar from './Sidebar.jsx'
import GlobalSearch from './GlobalSearch.jsx'

export default function AppShell() {
  const navigate = useNavigate()
  const role = supabase.auth.currentSession?.user?.app_metadata?.role ?? 'admin'

  async function handleSignOut() {
    await supabase.auth.signOut()
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      <Sidebar role={role} />
      <div className="ml-[220px] flex flex-col min-h-screen">
        <header className="h-14 bg-white border-b border-[#e0e2e6] flex items-center px-6 gap-4 sticky top-0 z-10">
          <GlobalSearch />
          <div className="ml-auto flex items-center gap-3">
            <span className="text-xs text-gray-500">{supabase.auth.currentSession?.user?.email}</span>
            <button
              onClick={handleSignOut}
              className="text-xs text-gray-500 hover:text-red-600"
            >
              Sign Out
            </button>
          </div>
        </header>
        <main className="flex-1 p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
