import { supabase } from '../supabase'

export async function getCustomers({ search = '', status = 'active' } = {}) {
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
}

export async function getCustomerById(customerId) {
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
}

export async function createCustomer(customerData) {
  const { data, error } = await supabase
    .from('customers')
    .insert(customerData)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function updateCustomer(customerId, updates) {
  const { data, error } = await supabase
    .from('customers')
    .update(updates)
    .eq('customer_id', customerId)
    .select()
    .single()

  if (error) throw error
  return data
}
