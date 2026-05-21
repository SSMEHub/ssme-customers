import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { getCustomersFiltered } from '../../lib/db/customers'
import StatusBadge from '../../components/ui/StatusBadge.jsx'
import EmptyState from '../../components/ui/EmptyState.jsx'
import PageHeader from '../../components/ui/PageHeader.jsx'

function useDebounce(value, delay) {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(t)
  }, [value, delay])
  return debounced
}

const ENTITY_TYPES = ['Sdn Bhd', 'Enterprise', 'Individual', 'Cooperative', 'Gov Agency', 'Other']

export default function CustomerList() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [entityType, setEntityType] = useState('')
  const debouncedSearch = useDebounce(search, 300)

  const { data: customers = [], isLoading } = useQuery({
    queryKey: ['customers', debouncedSearch, status, entityType],
    queryFn: () => getCustomersFiltered({ search: debouncedSearch, status, entityType }),
    staleTime: 5 * 60 * 1000,
  })

  return (
    <div>
      <PageHeader
        title="Customers"
        action={
          <button
            onClick={() => navigate('/customers/new')}
            className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 font-medium"
          >
            + Add Customer
          </button>
        }
      />

      {/* Filters bar */}
      <div className="flex items-center gap-3 mb-4">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search company, phone, code…"
          className="h-8 px-3 text-sm border border-[#e0e2e6] rounded w-64 bg-white focus:outline-none focus:border-blue-400"
        />
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="h-8 px-2 text-sm border border-[#e0e2e6] rounded bg-white focus:outline-none focus:border-blue-400"
        >
          <option value="">All Statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="rejected">Rejected</option>
        </select>
        <select
          value={entityType}
          onChange={(e) => setEntityType(e.target.value)}
          className="h-8 px-2 text-sm border border-[#e0e2e6] rounded bg-white focus:outline-none focus:border-blue-400"
        >
          <option value="">All Entity Types</option>
          {ENTITY_TYPES.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
        {(search || status || entityType) && (
          <button
            onClick={() => { setSearch(''); setStatus(''); setEntityType('') }}
            className="text-xs text-gray-500 hover:text-gray-700"
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Table */}
      {isLoading ? (
        <p className="text-sm text-gray-400 py-4">Loading…</p>
      ) : customers.length === 0 ? (
        <div className="bg-white border border-[#e0e2e6] rounded-lg">
          <EmptyState message="No customers found" />
        </div>
      ) : (
        <div className="bg-white border border-[#e0e2e6] rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[#f8fafc] border-b border-[#e0e2e6]">
                <th className="text-left px-4 py-2.5 font-medium text-gray-500 text-xs">Code</th>
                <th className="text-left px-4 py-2.5 font-medium text-gray-500 text-xs">Company Name</th>
                <th className="text-left px-4 py-2.5 font-medium text-gray-500 text-xs">Entity Type</th>
                <th className="text-left px-4 py-2.5 font-medium text-gray-500 text-xs">Phone</th>
                <th className="text-left px-4 py-2.5 font-medium text-gray-500 text-xs">Status</th>
              </tr>
            </thead>
            <tbody>
              {customers.map((c) => (
                <tr
                  key={c.customer_id}
                  onClick={() => navigate(`/customers/${c.customer_id}`)}
                  className="border-b border-[#e0e2e6] last:border-0 hover:bg-[#f8fafc] cursor-pointer"
                >
                  <td className="px-4 py-2.5 text-xs text-gray-500 font-mono">
                    {c.customer_code || '—'}
                  </td>
                  <td className="px-4 py-2.5 font-medium text-[#181d26]">{c.company_name}</td>
                  <td className="px-4 py-2.5 text-xs text-gray-600">{c.entity_type}</td>
                  <td className="px-4 py-2.5 text-xs text-gray-600">{c.phone || '—'}</td>
                  <td className="px-4 py-2.5">
                    <StatusBadge status={c.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="px-4 py-2 border-t border-[#e0e2e6] bg-[#f8fafc]">
            <p className="text-xs text-gray-400">{customers.length} record{customers.length !== 1 ? 's' : ''}</p>
          </div>
        </div>
      )}
    </div>
  )
}
