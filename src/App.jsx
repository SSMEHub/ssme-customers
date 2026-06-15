import { useState, useEffect } from 'react'
import { Routes, Route, Navigate, useLocation, useSearchParams, useNavigate } from 'react-router-dom'
import { supabase } from './lib/supabase'
import AppShell from './components/layout/AppShell.jsx'
import Login from './pages/Login.jsx'
import Dashboard from './pages/Dashboard.jsx'
import CustomerList from './pages/customers/CustomerList.jsx'
import CustomerDetail from './pages/customers/CustomerDetail.jsx'
import CustomerForm from './pages/customers/CustomerForm.jsx'
import VehicleList from './pages/vehicles/VehicleList.jsx'
import VehicleDetail from './pages/vehicles/VehicleDetail.jsx'
import VehicleForm from './pages/vehicles/VehicleForm.jsx'
import ImportPage from './pages/import/ImportPage.jsx'

function LoginRedirect() {
  const location = useLocation()
  if (location.pathname === '/login') return null
  const returnTo = encodeURIComponent(location.pathname + location.search)
  return <Navigate to={`/login?returnTo=${returnTo}`} replace />
}

export default function App() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  useEffect(() => {
    // Resolve loading inside the async callbacks (React-recommended) rather than
    // via a separate setState-in-effect that mirrors `session`.
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setLoading(false)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s)
      setLoading(false)
    })
    return () => subscription.unsubscribe()
  }, [])

  // Handle returnTo redirect when authenticated (session auto-restore case)
  useEffect(() => {
    if (session && !loading) {
      const returnTo = searchParams.get('returnTo')
      if (returnTo) {
        const decoded = decodeURIComponent(returnTo)
        if (decoded !== '/login') {
          navigate(decoded, { replace: true })
        }
      }
    }
  }, [session, loading, searchParams, navigate])

  if (loading) return <div className="min-h-screen bg-[#f8fafc]" />

  if (!session) {
    return (
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="*" element={<LoginRedirect />} />
      </Routes>
    )
  }

  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<Dashboard />} />
        <Route path="customers" element={<CustomerList />} />
        <Route path="customers/new" element={<CustomerForm />} />
        <Route path="customers/:id" element={<CustomerDetail />} />
        <Route path="customers/:id/edit" element={<CustomerForm />} />
        <Route path="vehicles" element={<VehicleList />} />
        <Route path="vehicles/new" element={<VehicleForm />} />
        <Route path="vehicles/:id" element={<VehicleDetail />} />
        <Route path="vehicles/:id/edit" element={<VehicleForm />} />
        <Route path="import" element={<ImportPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}
