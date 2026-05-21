import { useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { customerSchema, customerDefaults } from '../../schemas/customer'
import { getCustomerById, createCustomer, updateCustomer } from '../../lib/db/customers'
import PageHeader from '../../components/ui/PageHeader.jsx'

function Field({ label, error, required, children }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-700 mb-1">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {children}
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  )
}

const inputCls =
  'w-full h-8 px-3 text-sm border border-[#e0e2e6] rounded bg-white focus:outline-none focus:border-blue-400'
const selectCls =
  'w-full h-8 px-2 text-sm border border-[#e0e2e6] rounded bg-white focus:outline-none focus:border-blue-400'
const textareaCls =
  'w-full px-3 py-2 text-sm border border-[#e0e2e6] rounded bg-white focus:outline-none focus:border-blue-400 resize-none'

export default function CustomerForm() {
  const { id } = useParams()
  const isEdit = Boolean(id)
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const { data: existing } = useQuery({
    queryKey: ['customer', id],
    queryFn: () => getCustomerById(id),
    enabled: isEdit,
    staleTime: 5 * 60 * 1000,
  })

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(customerSchema),
    defaultValues: customerDefaults,
  })

  useEffect(() => {
    if (existing) reset(existing)
  }, [existing, reset])

  const mutation = useMutation({
    mutationFn: (data) =>
      isEdit ? updateCustomer(id, data) : createCustomer(data),
    onSuccess: (saved) => {
      queryClient.invalidateQueries({ queryKey: ['customers'] })
      queryClient.invalidateQueries({ queryKey: ['customer', id] })
      navigate(`/customers/${saved.customer_id}`)
    },
  })

  function onSubmit(data) {
    mutation.mutate(data)
  }

  const breadcrumb = isEdit
    ? { to: `/customers/${id}`, label: existing?.company_name ?? 'Customer' }
    : { to: '/customers', label: 'Customers' }

  return (
    <div className="max-w-3xl">
      <PageHeader
        breadcrumb={breadcrumb}
        title={isEdit ? 'Edit Customer' : 'New Customer'}
      />

      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <div className="bg-white border border-[#e0e2e6] rounded-lg p-6 mb-4">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Company Name" required error={errors.company_name?.message}>
              <input {...register('company_name')} className={inputCls} />
            </Field>
            <Field label="Entity Type" required error={errors.entity_type?.message}>
              <select {...register('entity_type')} className={selectCls}>
                <option value="">Select…</option>
                {['Sdn Bhd','Enterprise','Individual','Cooperative','Gov Agency','Other'].map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </Field>
            <Field label="Customer Code" error={errors.customer_code?.message}>
              <input {...register('customer_code')} className={inputCls} />
            </Field>
            <Field label="Status" required error={errors.status?.message}>
              <select {...register('status')} className={selectCls}>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="rejected">Rejected</option>
              </select>
            </Field>
            <Field label="Phone" error={errors.phone?.message}>
              <input {...register('phone')} className={inputCls} />
            </Field>
            <Field label="Email" error={errors.email?.message}>
              <input {...register('email')} type="email" className={inputCls} />
            </Field>
            <Field label="Contact Person" error={errors.contact_person?.message}>
              <input {...register('contact_person')} className={inputCls} />
            </Field>
            <Field label="IC / SSM Number" error={errors.id_number?.message}>
              <input {...register('id_number')} className={inputCls} />
            </Field>
            <Field label="ID Type" error={errors.id_type?.message}>
              <select {...register('id_type')} className={selectCls}>
                <option value="">Select…</option>
                <option value="SSM">SSM</option>
                <option value="IC">IC</option>
                <option value="Other">Other</option>
              </select>
            </Field>
            <div />
            <Field label="Address Line 1" error={errors.address_line1?.message}>
              <input {...register('address_line1')} className={inputCls} />
            </Field>
            <Field label="Address Line 2" error={errors.address_line2?.message}>
              <input {...register('address_line2')} className={inputCls} />
            </Field>
            <Field label="Postcode" error={errors.postcode?.message}>
              <input {...register('postcode')} maxLength={5} className={inputCls} />
            </Field>
            <Field label="City" error={errors.city?.message}>
              <input {...register('city')} className={inputCls} />
            </Field>
            <Field label="State" error={errors.state?.message}>
              <input {...register('state')} className={inputCls} />
            </Field>
            <div />
            <div className="col-span-2">
              <Field label="Notes" error={errors.notes?.message}>
                <textarea {...register('notes')} rows={3} className={textareaCls} />
              </Field>
            </div>
          </div>
        </div>

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
