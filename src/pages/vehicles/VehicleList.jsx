import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { getVehiclesWithNextExpiry } from '../../lib/db/vehicles'
import { exportToExcel, dateSuffixFilename } from '../../lib/export'
import StatusBadge from '../../components/ui/StatusBadge.jsx'
import EmptyState from '../../components/ui/EmptyState.jsx'
import PageHeader from '../../components/ui/PageHeader.jsx'
import ErrorBanner from '../../components/ui/ErrorBanner.jsx'

function useDebounce(value, delay) {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(t)
  }, [value, delay])
  return debounced
}

function expiryColor(dateStr) {
  if (!dateStr) return 'text-gray-400'
  const days = Math.ceil((new Date(dateStr) - new Date()) / 86400000)
  if (days < 0) return 'text-red-600 font-semibold'
  if (days <= 30) return 'text-orange-600 font-semibold'
  if (days <= 60) return 'text-yellow-700'
  return 'text-gray-600'
}

export default function VehicleList() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [maker, setMaker] = useState('')
  const [replacementOnly, setReplacementOnly] = useState(
    searchParams.get('age') === 'replacement'
  )
  const debouncedSearch = useDebounce(search, 300)

  const { data: vehicles = [], isLoading, isError, error, refetch } = useQuery({
    queryKey: ['vehicles', debouncedSearch, status, maker, replacementOnly],
    queryFn: () =>
      getVehiclesWithNextExpiry({
        search: debouncedSearch,
        status,
        maker,
        replacementOnly,
      }),
    staleTime: 5 * 60 * 1000,
  })

  return (
    <div>
      <PageHeader
        title="Vehicles"
        action={
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                // Flatten nested customers object so xlsx receives plain strings
                const rows = vehicles.map((v) => ({
                  ...v,
                  customer_name: v.customers?.company_name ?? '',
                  reg_year: v.reg_date
                    ? String(new Date(v.reg_date).getFullYear())
                    : v.manufacture_yr != null ? String(v.manufacture_yr) : '',
                }))
                exportToExcel(
                  rows,
                  {
                    plate_number: 'Plate No.',
                    chassis_no: 'Chassis No.',
                    maker: 'Maker',
                    model_code: 'Model Code',
                    customer_name: 'Owner',
                    status: 'Status',
                    reg_year: 'Reg Year',
                    next_expiry: 'Next Expiry',
                  },
                  dateSuffixFilename('vehicles'),
                )
              }}
              disabled={vehicles.length === 0}
              className="px-3 py-1.5 bg-white border border-[#e0e2e6] text-gray-700 text-sm rounded hover:bg-[#f8fafc] font-medium disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Export to Excel
            </button>
            <button
              onClick={() => navigate('/vehicles/new')}
              className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 font-medium"
            >
              + Add Vehicle
            </button>
          </div>
        }
      />

      {/* Filters */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search plate, chassis…"
          className="h-8 px-3 text-sm border border-[#e0e2e6] rounded w-56 bg-white focus:outline-none focus:border-blue-400"
        />
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="h-8 px-2 text-sm border border-[#e0e2e6] rounded bg-white focus:outline-none focus:border-blue-400"
        >
          <option value="">All Statuses</option>
          <option value="active">Active</option>
          <option value="in_shop">In Shop</option>
          <option value="decommissioned">Decommissioned</option>
          <option value="scrapped">Scrapped</option>
        </select>
        <input
          type="text"
          value={maker}
          onChange={(e) => setMaker(e.target.value)}
          placeholder="Maker…"
          className="h-8 px-3 text-sm border border-[#e0e2e6] rounded w-32 bg-white focus:outline-none focus:border-blue-400"
        />
        <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
          <input
            type="checkbox"
            checked={replacementOnly}
            onChange={(e) => setReplacementOnly(e.target.checked)}
            className="rounded"
          />
          ≥7 years only
        </label>
        {(search || status || maker || replacementOnly) && (
          <button
            onClick={() => {
              setSearch('')
              setStatus('')
              setMaker('')
              setReplacementOnly(false)
            }}
            className="text-xs text-gray-500 hover:text-gray-700"
          >
            Clear filters
          </button>
        )}
      </div>

      {isError && (
        <ErrorBanner message={error.message} onRetry={() => refetch()} />
      )}

      {isLoading ? (
        <p className="text-sm text-gray-400 py-4">Loading…</p>
      ) : vehicles.length === 0 ? (
        <div className="bg-white border border-[#e0e2e6] rounded-lg">
          <EmptyState message="No vehicles found" />
        </div>
      ) : (
        <div className="bg-white border border-[#e0e2e6] rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[#f8fafc] border-b border-[#e0e2e6]">
                <th className="text-left px-4 py-2.5 font-medium text-gray-500 text-xs">Plate</th>
                <th className="text-left px-4 py-2.5 font-medium text-gray-500 text-xs">Maker / Model</th>
                <th className="text-left px-4 py-2.5 font-medium text-gray-500 text-xs">Owner</th>
                <th className="text-left px-4 py-2.5 font-medium text-gray-500 text-xs">Body Type</th>
                <th className="text-left px-4 py-2.5 font-medium text-gray-500 text-xs">Reg Year</th>
                <th className="text-left px-4 py-2.5 font-medium text-gray-500 text-xs">Status</th>
                <th className="text-left px-4 py-2.5 font-medium text-gray-500 text-xs">Next Expiry</th>
              </tr>
            </thead>
            <tbody>
              {vehicles.map((v) => (
                <tr
                  key={v.vehicle_id}
                  onClick={() => navigate(`/vehicles/${v.vehicle_id}`)}
                  className="border-b border-[#e0e2e6] last:border-0 hover:bg-[#f8fafc] cursor-pointer"
                >
                  <td className="px-4 py-2.5 font-mono text-xs font-semibold">{v.plate_number}</td>
                  <td className="px-4 py-2.5 text-xs">
                    {[v.maker, v.model_code].filter(Boolean).join(' ') || '—'}
                  </td>
                  <td className="px-4 py-2.5 text-xs text-gray-600">
                    {v.customers?.company_name || '—'}
                  </td>
                  <td className="px-4 py-2.5 text-xs text-gray-600">{v.body_type || '—'}</td>
                  <td className="px-4 py-2.5 text-xs text-gray-600">
                    {v.reg_date
                      ? new Date(v.reg_date).getFullYear()
                      : v.manufacture_yr || '—'}
                  </td>
                  <td className="px-4 py-2.5">
                    <StatusBadge status={v.status} />
                  </td>
                  <td className={`px-4 py-2.5 text-xs ${expiryColor(v.next_expiry)}`}>
                    {v.next_expiry ?? '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="px-4 py-2 border-t border-[#e0e2e6] bg-[#f8fafc]">
            <p className="text-xs text-gray-400">{vehicles.length} vehicle{vehicles.length !== 1 ? 's' : ''}</p>
          </div>
        </div>
      )}
    </div>
  )
}
