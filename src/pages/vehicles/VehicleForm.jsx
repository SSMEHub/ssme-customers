import { useEffect } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { vehicleSchema, vehicleDefaults } from '../../schemas/vehicle'
import { getVehicleById, createVehicle, updateVehicle } from '../../lib/db/vehicles'
import { getCustomerById } from '../../lib/db/customers'
import PageHeader from '../../components/ui/PageHeader.jsx'

const inputCls =
  'w-full h-8 px-3 text-sm border border-[#e0e2e6] rounded bg-white focus:outline-none focus:border-blue-400'
const selectCls =
  'w-full h-8 px-2 text-sm border border-[#e0e2e6] rounded bg-white focus:outline-none focus:border-blue-400'
const textareaCls =
  'w-full px-3 py-2 text-sm border border-[#e0e2e6] rounded bg-white focus:outline-none focus:border-blue-400 resize-none'

function Field({ label, error, children }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-700 mb-1">{label}</label>
      {children}
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  )
}

function Section({ title, children }) {
  return (
    <div className="bg-white border border-[#e0e2e6] rounded-lg p-5 mb-4">
      <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-4">{title}</h3>
      <div className="grid grid-cols-2 gap-4">{children}</div>
    </div>
  )
}

export default function VehicleForm() {
  const { id } = useParams()
  const isEdit = Boolean(id)
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [searchParams] = useSearchParams()
  const prefilledCustomerId = searchParams.get('customer') || ''

  const { data: existing } = useQuery({
    queryKey: ['vehicle', id],
    queryFn: () => getVehicleById(id),
    enabled: isEdit,
    staleTime: 5 * 60 * 1000,
  })

  const { data: prefilledCustomer } = useQuery({
    queryKey: ['customer', prefilledCustomerId],
    queryFn: () => getCustomerById(prefilledCustomerId),
    enabled: Boolean(prefilledCustomerId) && !isEdit,
    staleTime: 5 * 60 * 1000,
  })

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(vehicleSchema),
    defaultValues: { ...vehicleDefaults, customer_id: prefilledCustomerId },
  })

  useEffect(() => {
    if (existing) reset(existing)
  }, [existing, reset])

  const mutation = useMutation({
    mutationFn: (data) =>
      isEdit ? updateVehicle(id, data) : createVehicle(data),
    onSuccess: (saved) => {
      queryClient.invalidateQueries({ queryKey: ['vehicles'] })
      queryClient.invalidateQueries({ queryKey: ['vehicle', id] })
      navigate(`/vehicles/${saved.vehicle_id}`)
    },
  })

  const breadcrumb = isEdit
    ? { to: `/vehicles/${id}`, label: existing?.plate_number ?? 'Vehicle' }
    : prefilledCustomer
    ? { to: `/customers/${prefilledCustomerId}`, label: prefilledCustomer.company_name }
    : { to: '/vehicles', label: 'Vehicles' }

  return (
    <div className="max-w-3xl">
      <PageHeader
        breadcrumb={breadcrumb}
        title={isEdit ? `Edit ${existing?.plate_number ?? ''}` : 'New Vehicle'}
      />

      <form onSubmit={handleSubmit((d) => mutation.mutate(d))} noValidate>
        <Section title="Identity">
          <Field label="Plate Number *" error={errors.plate_number?.message}>
            <input {...register('plate_number')} className={inputCls} placeholder="e.g. WB1234A" />
          </Field>
          <Field label="Chassis No *" error={errors.chassis_no?.message}>
            <input {...register('chassis_no')} className={inputCls} />
          </Field>
          <Field label="Engine No *" error={errors.engine_no?.message}>
            <input {...register('engine_no')} className={inputCls} />
          </Field>
          <Field label="Customer" error={errors.customer_id?.message}>
            <input {...register('customer_id')} className={inputCls} placeholder="Customer UUID" />
          </Field>
        </Section>

        <Section title="Specifications (JPJ)">
          <Field label="Maker" error={errors.maker?.message}>
            <input {...register('maker')} className={inputCls} placeholder="e.g. HINO" />
          </Field>
          <Field label="Model Code" error={errors.model_code?.message}>
            <input {...register('model_code')} className={inputCls} />
          </Field>
          <Field label="Body Type" error={errors.body_type?.message}>
            <input {...register('body_type')} className={inputCls} />
          </Field>
          <Field label="Colour" error={errors.colour?.message}>
            <input {...register('colour')} className={inputCls} />
          </Field>
          <Field label="GVW (kg)" error={errors.gvw_kg?.message}>
            <input {...register('gvw_kg')} type="number" className={inputCls} />
          </Field>
          <Field label="Kerb Weight (kg)" error={errors.kerb_weight_kg?.message}>
            <input {...register('kerb_weight_kg')} type="number" className={inputCls} />
          </Field>
          <Field label="Payload (kg)" error={errors.payload_kg?.message}>
            <input {...register('payload_kg')} type="number" className={inputCls} />
          </Field>
          <Field label="Engine Capacity" error={errors.engine_capacity?.message}>
            <input {...register('engine_capacity')} className={inputCls} />
          </Field>
          <Field label="Fuel Type" error={errors.fuel_type?.message}>
            <input {...register('fuel_type')} className={inputCls} />
          </Field>
          <Field label="Usage Class" error={errors.usage_class?.message}>
            <input {...register('usage_class')} className={inputCls} />
          </Field>
          <Field label="Assembly Type" error={errors.assembly_type?.message}>
            <select {...register('assembly_type')} className={selectCls}>
              <option value="">Select…</option>
              <option value="CKD">CKD</option>
              <option value="CBU">CBU</option>
            </select>
          </Field>
          <Field label="Manufacture Year" error={errors.manufacture_yr?.message}>
            <input {...register('manufacture_yr')} type="number" className={inputCls} placeholder="e.g. 2018" />
          </Field>
          <Field label="Reg Date" error={errors.reg_date?.message}>
            <input {...register('reg_date')} type="date" className={inputCls} />
          </Field>
        </Section>

        <Section title="Delivery">
          <Field label="Delivery Date" error={errors.delivery_date?.message}>
            <input {...register('delivery_date')} type="date" className={inputCls} />
          </Field>
          <Field label="Completion Date" error={errors.completion_date?.message}>
            <input {...register('completion_date')} type="date" className={inputCls} />
          </Field>
          <div className="col-span-2">
            <Field label="Body Builder" error={errors.body_builder?.message}>
              <input {...register('body_builder')} className={inputCls} />
            </Field>
          </div>
        </Section>

        <Section title="Commercial">
          <Field label="SQL Account Code" error={errors.sql_account_code?.message}>
            <input {...register('sql_account_code')} className={inputCls} />
          </Field>
          <Field label="Loan Bank" error={errors.loan_bank?.message}>
            <input {...register('loan_bank')} className={inputCls} />
          </Field>
          <Field label="Loan Tenure (months)" error={errors.loan_tenure_months?.message}>
            <input {...register('loan_tenure_months')} type="number" className={inputCls} />
          </Field>
        </Section>

        <Section title="Status">
          <Field label="Status" error={errors.status?.message}>
            <select {...register('status')} className={selectCls}>
              <option value="active">Active</option>
              <option value="in_shop">In Shop</option>
              <option value="decommissioned">Decommissioned</option>
              <option value="scrapped">Scrapped</option>
            </select>
          </Field>
          <div />
          <div className="col-span-2">
            <Field label="Notes" error={errors.notes?.message}>
              <textarea {...register('notes')} rows={3} className={textareaCls} />
            </Field>
          </div>
        </Section>

        {mutation.isError && (
          <p className="text-sm text-red-500 mb-4">
            {mutation.error?.message ?? 'Save failed. Please try again.'}
          </p>
        )}

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={isSubmitting || mutation.isPending}
            className="px-4 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 font-medium disabled:opacity-50"
          >
            {mutation.isPending ? 'Saving…' : 'Save'}
          </button>
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="px-4 py-2 border border-[#e0e2e6] text-sm rounded hover:bg-[#f8fafc] font-medium"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  )
}
