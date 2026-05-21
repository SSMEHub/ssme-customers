import { useParams, useNavigate, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { getCustomerById } from '../../lib/db/customers'
import StatusBadge from '../../components/ui/StatusBadge.jsx'
import EmptyState from '../../components/ui/EmptyState.jsx'
import PageHeader from '../../components/ui/PageHeader.jsx'

function InfoCard({ title, rows }) {
  return (
    <div className="bg-white border border-[#e0e2e6] rounded-lg p-4">
      <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">{title}</h3>
      <dl className="space-y-2">
        {rows.map(({ label, value }) => (
          <div key={label} className="flex gap-2">
            <dt className="text-xs text-gray-400 w-32 shrink-0">{label}</dt>
            <dd className="text-xs text-[#181d26] font-medium">{value || '—'}</dd>
          </div>
        ))}
      </dl>
    </div>
  )
}

function ageLabel(manufactureYr) {
  if (!manufactureYr) return null
  const age = new Date().getFullYear() - manufactureYr
  const replacementDue = age >= 7
  return (
    <span
      className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium ${
        replacementDue
          ? 'bg-red-100 text-red-700 border border-red-200'
          : 'bg-gray-100 text-gray-600 border border-gray-200'
      }`}
    >
      {age}y
    </span>
  )
}

export default function CustomerDetail() {
  const { id } = useParams()
  const navigate = useNavigate()

  const { data: customer, isLoading, isError } = useQuery({
    queryKey: ['customer', id],
    queryFn: () => getCustomerById(id),
    staleTime: 5 * 60 * 1000,
  })

  if (isLoading) return <p className="text-sm text-gray-400 p-6">Loading…</p>
  if (isError || !customer) return <p className="text-sm text-red-500 p-6">Customer not found.</p>

  const vehicles = customer.vehicles ?? []

  return (
    <div>
      <PageHeader
        breadcrumb={{ to: '/customers', label: 'Customers' }}
        title={customer.company_name}
        action={
          <button
            onClick={() => navigate(`/customers/${id}/edit`)}
            className="px-3 py-1.5 border border-[#e0e2e6] text-sm rounded hover:bg-[#f8fafc] font-medium"
          >
            Edit
          </button>
        }
      />

      {/* Header badges */}
      <div className="flex items-center gap-2 mb-6">
        {customer.customer_code && (
          <span className="text-xs bg-gray-100 border border-gray-200 text-gray-600 px-2 py-0.5 rounded font-mono">
            {customer.customer_code}
          </span>
        )}
        <span className="text-xs bg-blue-50 border border-blue-100 text-blue-700 px-2 py-0.5 rounded">
          {customer.entity_type}
        </span>
        <StatusBadge status={customer.status} />
        {customer.phone && (
          <span className="text-xs text-gray-500">{customer.phone}</span>
        )}
      </div>

      {/* Info cards */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <InfoCard
          title="Contact"
          rows={[
            { label: 'Phone', value: customer.phone },
            { label: 'Email', value: customer.email },
            { label: 'Contact Person', value: customer.contact_person },
          ]}
        />
        <InfoCard
          title="Address"
          rows={[
            { label: 'Address', value: customer.address_line1 },
            { label: '', value: customer.address_line2 },
            { label: 'Postcode', value: customer.postcode },
            { label: 'City', value: customer.city },
            { label: 'State', value: customer.state },
          ]}
        />
        <InfoCard
          title="Identity"
          rows={[
            { label: 'ID Number', value: customer.id_number },
            { label: 'ID Type', value: customer.id_type },
            { label: 'Notes', value: customer.notes },
          ]}
        />
      </div>

      {/* Fleet section */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-[#181d26]">Fleet ({vehicles.length})</h2>
        <Link
          to={`/vehicles/new?customer=${id}`}
          className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 font-medium"
        >
          + Add Vehicle
        </Link>
      </div>

      {vehicles.length === 0 ? (
        <div className="bg-white border border-[#e0e2e6] rounded-lg">
          <EmptyState
            message="No vehicles on record. Add one."
            action={
              <Link
                to={`/vehicles/new?customer=${id}`}
                className="text-sm text-blue-600 hover:underline"
              >
                Add Vehicle
              </Link>
            }
          />
        </div>
      ) : (
        <div className="bg-white border border-[#e0e2e6] rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[#f8fafc] border-b border-[#e0e2e6]">
                <th className="text-left px-4 py-2.5 font-medium text-gray-500 text-xs">Plate</th>
                <th className="text-left px-4 py-2.5 font-medium text-gray-500 text-xs">Maker / Model</th>
                <th className="text-left px-4 py-2.5 font-medium text-gray-500 text-xs">Body Type</th>
                <th className="text-left px-4 py-2.5 font-medium text-gray-500 text-xs">Reg Year</th>
                <th className="text-left px-4 py-2.5 font-medium text-gray-500 text-xs">Status</th>
                <th className="text-left px-4 py-2.5 font-medium text-gray-500 text-xs">Age</th>
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
                  <td className="px-4 py-2.5 text-xs text-gray-600">{v.body_type || '—'}</td>
                  <td className="px-4 py-2.5 text-xs text-gray-600">
                    {v.reg_date ? new Date(v.reg_date).getFullYear() : v.manufacture_yr || '—'}
                  </td>
                  <td className="px-4 py-2.5">
                    <StatusBadge status={v.status} />
                  </td>
                  <td className="px-4 py-2.5">{ageLabel(v.manufacture_yr)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
