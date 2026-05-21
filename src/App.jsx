import { Routes, Route, Navigate } from 'react-router-dom'
import AppShell from './components/layout/AppShell.jsx'
import Dashboard from './pages/Dashboard.jsx'
import CustomerList from './pages/customers/CustomerList.jsx'
import CustomerDetail from './pages/customers/CustomerDetail.jsx'
import CustomerForm from './pages/customers/CustomerForm.jsx'
import VehicleList from './pages/vehicles/VehicleList.jsx'
import VehicleDetail from './pages/vehicles/VehicleDetail.jsx'
import VehicleForm from './pages/vehicles/VehicleForm.jsx'
import ImportPage from './pages/import/ImportPage.jsx'

export default function App() {
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
