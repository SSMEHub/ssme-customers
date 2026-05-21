import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { getVehicleById } from '../../lib/db/vehicles'
import { getDocumentsByVehicle } from '../../lib/db/documents'
import StatusBadge from '../../components/ui/StatusBadge.jsx'
import PageHeader from '../../components/ui/PageHeader.jsx'
import DocumentCabinet from './DocumentCabinet.jsx'

function SpecRow({ label, value }) {
  return (
    <div className="flex gap-2">
      <dt className="text-xs text-gray-400 w-40 shrink-0">{label}</dt>
      <dd className="text-xs text-[#181d26] font-medium">{value || '—'}</dd>
    </div>
  )
}

export default function VehicleDetail() {
  const { id } = useParams()
  const navigate = useNavigate()

  const { data: vehicle, isLoading, isError } = useQuery({
    queryKey: ['vehicle', id],
    queryFn: () => getVehicleById(id),
    staleTime: 5 * 60 * 1000,
  })

  const { data: documents = [] } = useQuery({
    queryKey: ['vehicle-documents', id],
    queryFn: () => getDocumentsByVehicle(id),
    staleTime: 5 * 60 * 1000,
    enabled: Boolean(id),
  })

  if (isLoading) return <p className="text-sm text-gray-400 p-6">Loading…</p>
  if (isError || !vehicle) return <p className="text-sm text-red-500 p-6">Vehicle not found.</p>

  const customer = vehicle.customers

  return (
    <div>
      <PageHeader
        breadcrumb={
          customer
            ? { to: `/customers/${customer.customer_id}`, label: customer.company_name }
            : { to: '/vehicles', label: 'Vehicles' }
        }
        title={vehicle.plate_number}
        action={
          <button
            onClick={() => navigate(`/vehicles/${id}/edit`)}
            className="px-3 py-1.5 border border-[#e0e2e6] text-sm rounded hover:bg-[#f8fafc] font-medium"
          >
            Edit
          </button>
        }
      />

      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <span className="text-sm text-gray-600">
          {[vehicle.maker, vehicle.model_code].filter(Boolean).join(' ')}
        </span>
        <StatusBadge status={vehicle.status} />
      </div>

      {/* Specs */}
      <div className="bg-white border border-[#e0e2e6] rounded-lg p-5 mb-6">
        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-4">Specifications</h2>
        <div className="grid grid-cols-2 gap-x-8 gap-y-2">
          <dl className="space-y-2">
            <SpecRow label="Chassis No" value={vehicle.chassis_no} />
            <SpecRow label="Engine No" value={vehicle.engine_no} />
            <SpecRow label="Body Type" value={vehicle.body_type} />
            <SpecRow label="Colour" value={vehicle.colour} />
            <SpecRow label="Fuel Type" value={vehicle.fuel_type} />
            <SpecRow label="Assembly" value={vehicle.assembly_type} />
            <SpecRow label="Usage Class" value={vehicle.usage_class} />
            <SpecRow label="Manufacture Year" value={vehicle.manufacture_yr} />
          </dl>
          <dl className="space-y-2">
            <SpecRow label="GVW (kg)" value={vehicle.gvw_kg} />
            <SpecRow label="Kerb Weight (kg)" value={vehicle.kerb_weight_kg} />
            <SpecRow label="Payload (kg)" value={vehicle.payload_kg} />
            <SpecRow label="Engine Capacity" value={vehicle.engine_capacity} />
            <SpecRow label="Reg Date" value={vehicle.reg_date} />
            <SpecRow label="Delivery Date" value={vehicle.delivery_date} />
            <SpecRow label="Completion Date" value={vehicle.completion_date} />
            <SpecRow label="Body Builder" value={vehicle.body_builder} />
          </dl>
        </div>
        {(vehicle.sql_account_code || vehicle.loan_bank || vehicle.loan_tenure_months) && (
          <div className="mt-4 pt-4 border-t border-[#e0e2e6]">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Commercial</h3>
            <dl className="grid grid-cols-2 gap-x-8 gap-y-2">
              <SpecRow label="SQL Account Code" value={vehicle.sql_account_code} />
              <SpecRow label="Loan Bank" value={vehicle.loan_bank} />
              <SpecRow label="Loan Tenure (months)" value={vehicle.loan_tenure_months} />
            </dl>
          </div>
        )}
        {vehicle.notes && (
          <div className="mt-4 pt-4 border-t border-[#e0e2e6]">
            <p className="text-xs text-gray-400 mb-1">Notes</p>
            <p className="text-xs text-[#181d26]">{vehicle.notes}</p>
          </div>
        )}
      </div>

      {/* Document Cabinet */}
      <DocumentCabinet vehicleId={id} documents={documents} />
    </div>
  )
}
