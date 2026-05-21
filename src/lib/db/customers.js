// @ts-check
import { z } from 'zod'
import { supabase } from '../supabase'

const CustomerInsertSchema = z.object({
  company_name: z.string().min(1),
  entity_type: z.enum(['sdn_bhd', 'enterprise', 'individual', 'cooperative', 'gov_agency', 'other']).optional(),
  id_type: z.enum(['ssm', 'ic', 'other']).optional(),
  id_number: z.string().optional(),
  status: z.enum(['active', 'inactive', 'rejected']).optional(),
  address_line1: z.string().optional(),
  address_line2: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  postcode: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  customer_code: z.string().optional(),
})

const CustomerUpdateSchema = CustomerInsertSchema.partial()

/**
 * Fetch customers filtered by status and optional name search.
 * @param {{ search?: string, status?: 'active'|'inactive'|'rejected' }} [opts]
 * @returns {Promise<object[]>}
 * @throws {Error} on Supabase query failure
 */
export async function getCustomers({ search = '', status = 'active' } = {}) {
  try {
    let query = supabase
      .from('customers')
      .select('*')
      .eq('status', status)
      .order('company_name')

    if (search) {
      query = query.ilike('company_name', `%${search}%`)
    }

    const { data, error } = await query
    if (error) throw error
    return data
  } catch (error) {
    console.error(JSON.stringify({ operation: 'getCustomers', params: { search, status }, message: error.message, code: error.code, ts: new Date().toISOString() }))
    throw error
  }
}

/**
 * Fetch a single customer with their associated vehicles.
 * @param {string} customerId - UUID of the customer
 * @returns {Promise<object>}
 * @throws {Error} if customer not found or query fails
 */
export async function getCustomerById(customerId) {
  try {
    const { data, error } = await supabase
      .from('customers')
      .select(`
        *,
        vehicles (
          vehicle_id, plate_number, maker, model_code, body_type,
          manufacture_yr, reg_date, status, last_mileage_km
        )
      `)
      .eq('customer_id', customerId)
      .single()

    if (error) throw error
    return data
  } catch (error) {
    console.error(JSON.stringify({ operation: 'getCustomerById', params: { customerId }, message: error.message, code: error.code, ts: new Date().toISOString() }))
    throw error
  }
}

/**
 * Insert a new customer record.
 * @param {z.infer<typeof CustomerInsertSchema>} customerData
 * @returns {Promise<object>} the inserted customer row
 * @throws {z.ZodError} if customerData fails schema validation
 * @throws {Error} on Supabase insert failure
 */
export async function createCustomer(customerData) {
  try {
    const validated = CustomerInsertSchema.parse(customerData)
    const { data, error } = await supabase
      .from('customers')
      .insert(validated)
      .select()
      .single()

    if (error) throw error
    return data
  } catch (error) {
    console.error(JSON.stringify({ operation: 'createCustomer', message: error.message, code: error.code, ts: new Date().toISOString() }))
    throw error
  }
}

/**
 * Update an existing customer's fields.
 * Only fields present in CustomerUpdateSchema are accepted; unknown fields are stripped.
 * @param {string} customerId - UUID of the customer to update
 * @param {z.infer<typeof CustomerUpdateSchema>} updates
 * @returns {Promise<object>} the updated customer row
 * @throws {z.ZodError} if updates fail schema validation
 * @throws {Error} on Supabase update failure
 */
export async function updateCustomer(customerId, updates) {
  try {
    const validated = CustomerUpdateSchema.parse(updates)
    const { data, error } = await supabase
      .from('customers')
      .update(validated)
      .eq('customer_id', customerId)
      .select()
      .single()

    if (error) throw error
    return data
  } catch (error) {
    console.error(JSON.stringify({ operation: 'updateCustomer', params: { customerId }, message: error.message, code: error.code, ts: new Date().toISOString() }))
    throw error
  }
}

export async function deleteCustomer(customerId) {
  const { error } = await supabase
    .from('customers')
    .delete()
    .eq('customer_id', customerId)

  if (error) throw error
}

export async function getCustomerCount({ status = 'active' } = {}) {
  const { count, error } = await supabase
    .from('customers')
    .select('*', { count: 'exact', head: true })
    .eq('status', status)

  if (error) throw error
  return count
}

export async function searchCustomers(term) {
  const { data, error } = await supabase
    .from('customers')
    .select('customer_id, company_name, customer_code, entity_type, phone, status')
    .or(
      `company_name.ilike.%${term}%,phone.ilike.%${term}%,customer_code.ilike.%${term}%`
    )
    .eq('status', 'active')
    .limit(8)
    .order('company_name')

  if (error) throw error
  return data
}

export async function getCustomersFiltered({ search = '', status = '', entityType = '' } = {}) {
  let query = supabase
    .from('customers')
    .select('customer_id, company_name, customer_code, entity_type, phone, status')
    .order('company_name')

  if (search) {
    query = query.or(
      `company_name.ilike.%${search}%,phone.ilike.%${search}%,customer_code.ilike.%${search}%`
    )
  }
  if (status) query = query.eq('status', status)
  if (entityType) query = query.eq('entity_type', entityType)

  const { data, error } = await query
  if (error) throw error
  return data
}
